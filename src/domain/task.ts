import { isCalendarDate } from "./dates";
import { isRecord } from "./guards";
import { PRIORITIES, isPriority, type Priority } from "./priority";
import { isRecurrence, type Recurrence } from "./recurrence";
import { completeSubtasks, dropUnreadableSubtasks, isSubtaskList, type Subtask } from "./subtasks";

export { isCalendarDate, isRecord };

export { PRIORITIES, isPriority, type Priority };

export const STATUSES = ["todo", "in-progress", "completed"] as const;

export type Status = (typeof STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  /** Calendar date as YYYY-MM-DD, or null when there is no due date. */
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** How the task repeats. Present only on tasks that belong to a live series, with `seriesId`. */
  recurrence?: Recurrence;
  /** Shared by every occurrence of a recurring task. Present exactly when `recurrence` is. */
  seriesId?: string;
  /**
   * What each new occurrence of the series is made from. It changes only when the whole series is
   * edited, so a one-off edit of one occurrence does not spread. Older data may not have it, in
   * which case the occurrence own details are used.
   */
  seriesTemplate?: SeriesTemplate;
  /** The steps inside this task, in the order the user chose. Absent when there are none. */
  subtasks?: Subtask[];
}

/** The details every new occurrence of a recurring task starts with. */
export interface SeriesTemplate {
  title: string;
  description: string;
  priority: Priority;
  tags: string[];
}

export function isStatus(value: unknown): value is Status {
  return STATUSES.some((status) => status === value);
}

function isSeriesTemplate(value: unknown): value is SeriesTemplate {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.description === "string" &&
    isPriority(value.priority) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string" && tag.trim().length > 0)
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  dueDate?: string | null;
  tags?: string[];
  /** A rule makes the task repeat; `null` makes it stop repeating; leaving it out changes nothing. */
  recurrence?: Recurrence | null;
}

export const NEEDS_DUE_DATE = "Choose a due date to start the repeat from.";

export type TaskResult = { ok: true; task: Task } | { ok: false; error: string };

/** Trim tags, drop empty ones, and de-duplicate ignoring case (first spelling wins). */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (tag === "") continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

function normalizeDueDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return isCalendarDate(value) ? value : undefined;
}

export function createTask(
  input: TaskInput,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
  seriesId: string = crypto.randomUUID(),
): TaskResult {
  const title = input.title.trim();
  if (title === "") return { ok: false, error: "Title is required." };

  const dueDate = normalizeDueDate(input.dueDate);
  if (dueDate === undefined) return { ok: false, error: "Due date is not a valid date." };
  if (input.recurrence && dueDate === null) return { ok: false, error: NEEDS_DUE_DATE };

  const timestamp = now.toISOString();
  const task: Task = {
    id,
    title,
    description: input.description ?? "",
    priority: input.priority ?? "medium",
    status: input.status ?? "todo",
    dueDate,
    tags: normalizeTags(input.tags ?? []),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (input.recurrence) {
    task.recurrence = input.recurrence;
    task.seriesId = seriesId;
  }
  return { ok: true, task };
}

/**
 * Apply edits to a task. Omitted fields keep their value; `dueDate: null` clears it. The repeat rule
 * is kept unless the input gives a new one or `null` (which also removes the series). `seriesId`
 * names the series to start when a plain task is given a rule.
 */
export function updateTask(
  task: Task,
  input: TaskInput,
  now: Date = new Date(),
  seriesId: string = crypto.randomUUID(),
): TaskResult {
  const result = createTask(
    {
      title: input.title,
      description: input.description ?? task.description,
      priority: input.priority ?? task.priority,
      status: input.status ?? task.status,
      dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate,
      tags: input.tags ?? task.tags,
      recurrence: input.recurrence === undefined ? (task.recurrence ?? null) : input.recurrence,
    },
    now,
    task.id,
    task.seriesId ?? seriesId,
  );
  if (!result.ok) return result;
  const kept = task.seriesTemplate && result.task.recurrence ? { seriesTemplate: task.seriesTemplate } : {};
  const steps = task.subtasks
    ? { subtasks: becomesCompleted(task, result.task) ? completeSubtasks(task.subtasks) : task.subtasks }
    : {};
  return { ok: true, task: { ...result.task, ...kept, ...steps, createdAt: task.createdAt } };
}

function becomesCompleted(before: Task, after: Task): boolean {
  return before.status !== "completed" && after.status === "completed";
}

/** Complete a task, and with it every step inside it. */
export function completeTask(task: Task, now: Date = new Date()): Task {
  const done: Task = { ...task, status: "completed", updatedAt: now.toISOString() };
  return task.subtasks ? { ...done, subtasks: completeSubtasks(task.subtasks) } : done;
}

/**
 * True when a task's `recurrence`, `seriesId`, and `seriesTemplate` are all absent, or the rule and
 * series id are present and consistent and any template is valid.
 */
function hasReadableRecurrence(record: Record<string, unknown>): boolean {
  if (record.recurrence === undefined && record.seriesId === undefined && record.seriesTemplate === undefined) {
    return true;
  }
  return (
    isRecurrence(record.recurrence) &&
    typeof record.seriesId === "string" &&
    record.seriesId.length > 0 &&
    isCalendarDate(record.dueDate) &&
    (record.seriesTemplate === undefined || isSeriesTemplate(record.seriesTemplate))
  );
}

/**
 * Before validating stored or imported data, remove `recurrence`, `seriesId`, and `seriesTemplate` from any task
 * where they are unreadable or inconsistent, so one bad rule never makes a whole document
 * unreadable. The task becomes an ordinary one-time task. Everything else is left as it was, and
 * the input is never changed.
 */
export function dropUnreadableRecurrence(value: unknown): unknown {
  if (!isRecord(value) || hasReadableRecurrence(value)) return value;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "recurrence" && key !== "seriesId" && key !== "seriesTemplate"),
  );
}

/**
 * Repair one stored or imported task before validating it: unreadable repeat settings and
 * unreadable subtasks are removed, so one bad optional field never makes a whole document
 * unreadable. Everything else is left as it was, and the input is never changed.
 */
export function repairStoredTask(value: unknown): unknown {
  return dropUnreadableSubtasks(dropUnreadableRecurrence(value));
}

/** Type guard for untrusted data (stored document or imported file). */
export function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  const v = value;
  return (
    hasReadableRecurrence(v) &&
    (v.subtasks === undefined || isSubtaskList(v.subtasks)) &&
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.title === "string" &&
    v.title.trim().length > 0 &&
    typeof v.description === "string" &&
    isPriority(v.priority) &&
    isStatus(v.status) &&
    (v.dueDate === null || isCalendarDate(v.dueDate)) &&
    Array.isArray(v.tags) &&
    v.tags.every((t) => typeof t === "string" && t.trim().length > 0) &&
    isIsoTimestamp(v.createdAt) &&
    isIsoTimestamp(v.updatedAt)
  );
}
