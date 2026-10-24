import { datesBetween, nextDate } from "./recurrence";
import { copySubtasks } from "./subtasks";
import {
  completeTask,
  createTask,
  updateTask,
  type Priority,
  type SeriesTemplate,
  type Task,
  type TaskInput,
} from "./task";

/*
 * What happens to a recurring series when one of its tasks is completed, edited, stopped, or
 * deleted. A series is a set of ordinary tasks sharing a `seriesId`; only its open occurrence (the
 * one that is not completed) is live, and completing it creates the next. Every operation returns
 * a change set so the app can apply it in one step and never leaves a series with two open
 * occurrences.
 */

/** What an edit applies to: the one task, or the whole series. */
export type EditScope = "occurrence" | "series";

/** What completing a task did: it was an ordinary task, a new occurrence was made, or the series ended. */
export type Outcome = "done" | "next" | "last";

export interface ChangeSet {
  /** Tasks to replace (same id) or add (new id). */
  upsert: Task[];
  /** Ids of tasks to remove. */
  remove: string[];
  outcome: Outcome | null;
  /** The occurrence that was created, if any. */
  next: Task | null;
}

/** Ids for anything an operation may create. */
export interface NewIds {
  newId: string;
  seriesId: string;
}

export type SaveResult = { ok: true; changes: ChangeSet } | { ok: false; error: string };

/** Ids for creating a task: the task itself, the next occurrence if one is made at once, and the series. */
export interface CreateIds extends NewIds {
  taskId: string;
}

/** A future occurrence drawn on the calendar. It is never stored. */
export interface Preview {
  /** The open occurrence the date comes from. */
  task: Task;
  date: string;
  /** What the occurrence will be called and how important it will be, from the series details. */
  title: string;
  priority: Priority;
}

function noChange(): ChangeSet {
  return { upsert: [], remove: [], outcome: null, next: null };
}

/** The series own details: its template, or, for older data, the task own details. */
function templateOf(task: Task): SeriesTemplate {
  return task.seriesTemplate ?? templateFrom(task);
}

function templateFrom(task: Task): SeriesTemplate {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    tags: [...task.tags],
  };
}

/** The task as an ordinary one: no rule, no series, no template. */
function strip(task: Task): Task {
  const { recurrence: _rule, seriesId: _series, seriesTemplate: _template, ...ordinary } = task;
  return ordinary;
}

function membersOf(tasks: Task[], seriesId: string): Task[] {
  return tasks.filter((task) => task.seriesId === seriesId);
}

/** The series task that is not completed, or `undefined` if the series has no open occurrence. */
export function openOccurrence(tasks: Task[], seriesId: string): Task | undefined {
  return tasks.find((task) => task.seriesId === seriesId && task.status !== "completed");
}

/**
 * `completed` is a task that has just been completed. Make the next occurrence if its rule has
 * another date, or end the series if it has none.
 */
function finishCompletion(tasks: Task[], completed: Task, now: Date, newId: string): ChangeSet {
  const rule = completed.recurrence;
  const seriesId = completed.seriesId;
  if (!rule || !seriesId || completed.dueDate === null) {
    return { upsert: [completed], remove: [], outcome: "done", next: null };
  }

  const date = nextDate(rule, completed.dueDate);
  if (date === null) {
    const others = membersOf(tasks, seriesId)
      .filter((task) => task.id !== completed.id)
      .map(strip);
    return { upsert: [strip(completed), ...others], remove: [], outcome: "last", next: null };
  }

  const template = templateOf(completed);
  const timestamp = now.toISOString();
  const next: Task = {
    id: newId,
    title: template.title,
    description: template.description,
    priority: template.priority,
    status: "todo",
    dueDate: date,
    tags: [...template.tags],
    createdAt: timestamp,
    updatedAt: timestamp,
    recurrence: rule,
    seriesId,
    seriesTemplate: { ...template, tags: [...template.tags] },
    // A repeating checklist starts fresh each time.
    ...(completed.subtasks ? { subtasks: copySubtasks(completed.subtasks, newId) } : {}),
  };
  return { upsert: [completed, next], remove: [], outcome: "next", next };
}

/** Complete a task. A recurring one gets a next occurrence (or ends its series on its last date). */
export function completeOccurrence(tasks: Task[], task: Task, now: Date, newId: string): ChangeSet {
  if (task.status === "completed") return noChange();
  return finishCompletion(tasks, completeTask(task, now), now, newId);
}

/** Give a task that is starting or changing a series its details template. */
function withTemplate(task: Task): Task {
  return task.recurrence ? { ...task, seriesTemplate: templateFrom(task) } : task;
}

function justCompleted(before: Task, after: Task): boolean {
  return before.status !== "completed" && after.status === "completed";
}

function saveOne(tasks: Task[], original: Task, input: TaskInput, now: Date, ids: NewIds): SaveResult {
  const updated = updateTask(original, input, now, ids.seriesId);
  if (!updated.ok) return updated;

  // A plain task that has just been given a rule starts a series with its own details.
  let task = original.seriesId ? updated.task : withTemplate(updated.task);

  if (justCompleted(original, task)) {
    return { ok: true, changes: finishCompletion(tasks, task, now, ids.newId) };
  }
  if (original.seriesId && original.status === "completed" && task.status !== "completed") {
    // Reopening: a series must never have two open occurrences.
    const otherOpen = tasks.some(
      (t) => t.seriesId === original.seriesId && t.id !== original.id && t.status !== "completed",
    );
    if (otherOpen) task = strip(task);
  }
  return { ok: true, changes: { upsert: [task], remove: [], outcome: null, next: null } };
}

function saveWholeSeries(
  tasks: Task[],
  original: Task,
  open: Task,
  input: TaskInput,
  now: Date,
  ids: NewIds,
): SaveResult {
  const rule = input.recurrence === undefined ? (open.recurrence ?? null) : input.recurrence;
  const seriesId = open.seriesId ?? "";
  const stopping = rule === null;
  const others = membersOf(tasks, seriesId).filter((task) => task.id !== open.id);

  if (original.id === open.id) {
    // Editing the open occurrence: series details, and also its own due date and status.
    const updated = updateTask(open, { ...input, recurrence: rule }, now, ids.seriesId);
    if (!updated.ok) return updated;
    if (stopping) {
      const outcome = justCompleted(open, updated.task) ? "done" : null;
      return { ok: true, changes: { upsert: [updated.task, ...others.map(strip)], remove: [], outcome, next: null } };
    }
    const task = withTemplate(updated.task);
    if (justCompleted(open, task)) {
      return { ok: true, changes: finishCompletion(tasks, task, now, ids.newId) };
    }
    return { ok: true, changes: { upsert: [task], remove: [], outcome: null, next: null } };
  }

  // Editing a completed occurrence: only the series details go to the open occurrence.
  const updated = updateTask(
    open,
    {
      title: input.title,
      description: input.description,
      priority: input.priority,
      tags: input.tags,
      recurrence: rule,
    },
    now,
    ids.seriesId,
  );
  if (!updated.ok) return updated;
  if (stopping) {
    return { ok: true, changes: { upsert: [updated.task, ...others.map(strip)], remove: [], outcome: null, next: null } };
  }
  return { ok: true, changes: { upsert: [withTemplate(updated.task)], remove: [], outcome: null, next: null } };
}

/**
 * Save an edit. `scope` says whether it applies to `original` alone or to the whole series; the
 * rule, the series details (title, description, priority, tags), and the end date belong to the
 * series, while the due date and status always belong to the one occurrence.
 */
export function saveOccurrence(
  tasks: Task[],
  original: Task,
  input: TaskInput,
  scope: EditScope,
  now: Date,
  ids: NewIds,
): SaveResult {
  const open = original.seriesId ? openOccurrence(tasks, original.seriesId) : undefined;
  if (scope === "series" && original.seriesId && open) {
    return saveWholeSeries(tasks, original, open, input, now, ids);
  }
  if (original.seriesId) {
    // One occurrence only: the rule is the series', so it is not taken from the input.
    const { recurrence: _ignored, ...own } = input;
    return saveOne(tasks, original, own, now, ids);
  }
  return saveOne(tasks, original, input, now, ids);
}

/** Create a task. One given a repeat rule starts a series, and if it is created completed, its next occurrence is made too. */
export function createOccurrence(input: TaskInput, now: Date, ids: CreateIds): SaveResult {
  const created = createTask(input, now, ids.taskId, ids.seriesId);
  if (!created.ok) return created;
  const task = withTemplate(created.task);
  if (task.status === "completed") {
    return { ok: true, changes: finishCompletion([], task, now, ids.newId) };
  }
  return { ok: true, changes: { upsert: [task], remove: [], outcome: null, next: null } };
}

/** End a series: its tasks stay, but none of them repeats any more. */
export function stopSeries(tasks: Task[], seriesId: string, now: Date = new Date()): ChangeSet {
  const upsert = membersOf(tasks, seriesId).map((task) => {
    const ordinary = strip(task);
    return task.status === "completed" ? ordinary : { ...ordinary, updatedAt: now.toISOString() };
  });
  return { upsert, remove: [], outcome: null, next: null };
}

/** Delete a task. Deleting a series' open occurrence ends the series for the tasks that remain. */
export function deleteOccurrence(tasks: Task[], task: Task, _now: Date = new Date()): ChangeSet {
  const endsSeries = task.seriesId !== undefined && task.status !== "completed";
  const upsert =
    endsSeries && task.seriesId !== undefined
      ? membersOf(tasks, task.seriesId)
          .filter((member) => member.id !== task.id)
          .map(strip)
      : [];
  return { upsert, remove: [task.id], outcome: null, next: null };
}

/**
 * The future occurrences to draw for the dates `from` to `to`. They come from each series' open
 * occurrence and fall after both its due date and today, so none is ever drawn in the past.
 */
export function previewsFor(tasks: Task[], from: string, to: string, today: string): Preview[] {
  const previews: Preview[] = [];
  const seen = new Set<string>();

  for (const task of tasks) {
    const rule = task.recurrence;
    if (!rule || task.seriesId === undefined || task.dueDate === null || task.status === "completed") continue;
    if (seen.has(task.seriesId)) continue;
    seen.add(task.seriesId);

    const after = task.dueDate > today ? task.dueDate : today;
    const template = templateOf(task);
    for (const date of datesBetween(rule, after, from, to)) {
      previews.push({ task, date, title: template.title, priority: template.priority });
    }
  }

  return previews.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}
