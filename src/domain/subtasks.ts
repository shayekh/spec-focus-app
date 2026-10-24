import { isCalendarDate } from "./dates";
import { isRecord } from "./guards";
import { isPriority, type Priority } from "./priority";
import type { Task } from "./task";

/*
 * Subtasks: the small steps inside one task. They are stored on the task, in the order the user
 * chose, and every operation here takes a task and returns a new one, so the app can apply one user
 * action as one update. A subtask has no tags of its own: it shows its parent's.
 */

/** The most subtasks one task can hold. */
export const MAX_SUBTASKS = 50;

export interface Subtask {
  /** Unique within its task. */
  id: string;
  title: string;
  priority: Priority;
  /** Calendar date as YYYY-MM-DD, or null when there is none. */
  dueDate: string | null;
  done: boolean;
}

/** What the user can set on a subtask. */
export interface SubtaskInput {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
}

export type AddResult = { ok: true; task: Task; subtask: Subtask } | { ok: false; error: string };
export type EditResult = { ok: true; task: Task } | { ok: false; error: string };

export interface Progress {
  done: number;
  total: number;
}

const TITLE_REQUIRED = "Title is required.";
const BAD_DATE = "Due date is not a valid date.";
const TOO_MANY = `A task can have up to ${MAX_SUBTASKS} subtasks.`;

function subtasksOf(task: Task): Subtask[] {
  return task.subtasks ?? [];
}

/** The task with a new list of subtasks. An empty list is never stored: the field goes away. */
function withSubtasks(task: Task, subtasks: Subtask[], now: Date): Task {
  const { subtasks: _old, ...rest } = task;
  const updatedAt = now.toISOString();
  return subtasks.length === 0 ? { ...rest, updatedAt } : { ...rest, subtasks, updatedAt };
}

/** A date from the form: empty means none, anything else must be a real date (`undefined` if not). */
function normalizeDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return isCalendarDate(value) ? value : undefined;
}

export function addSubtask(task: Task, input: SubtaskInput, id: string, now: Date): AddResult {
  const title = input.title.trim();
  if (title === "") return { ok: false, error: TITLE_REQUIRED };
  const dueDate = normalizeDate(input.dueDate);
  if (dueDate === undefined) return { ok: false, error: BAD_DATE };
  const current = subtasksOf(task);
  if (current.length >= MAX_SUBTASKS) return { ok: false, error: TOO_MANY };

  const subtask: Subtask = { id, title, priority: input.priority ?? "medium", dueDate, done: false };
  return { ok: true, subtask, task: withSubtasks(task, [...current, subtask], now) };
}

/** Change a subtask's title, priority, and due date. Whether it is done, and where it sits, are kept. */
export function editSubtask(
  task: Task,
  subtaskId: string,
  input: SubtaskInput & { priority: Priority },
  now: Date,
): EditResult {
  const current = subtasksOf(task);
  if (!current.some((subtask) => subtask.id === subtaskId)) {
    return { ok: false, error: "That subtask no longer exists." };
  }
  const title = input.title.trim();
  if (title === "") return { ok: false, error: TITLE_REQUIRED };
  const dueDate = normalizeDate(input.dueDate);
  if (dueDate === undefined) return { ok: false, error: BAD_DATE };

  const changed = current.map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, title, priority: input.priority, dueDate } : subtask,
  );
  return { ok: true, task: withSubtasks(task, changed, now) };
}

/**
 * Tick or untick a subtask. `offerComplete` is true when this made every subtask of an open task
 * done, which is the moment to ask the user whether the task is finished too. The task itself is
 * never completed here.
 */
export function setSubtaskDone(
  task: Task,
  subtaskId: string,
  done: boolean,
  now: Date,
): { task: Task; offerComplete: boolean } {
  const current = subtasksOf(task);
  if (!current.some((subtask) => subtask.id === subtaskId)) return { task, offerComplete: false };

  const changed = current.map((subtask) => (subtask.id === subtaskId ? { ...subtask, done } : subtask));
  const offerComplete = done && task.status !== "completed" && changed.every((subtask) => subtask.done);
  return { task: withSubtasks(task, changed, now), offerComplete };
}

export function deleteSubtask(task: Task, subtaskId: string, now: Date): Task {
  const current = subtasksOf(task);
  if (!current.some((subtask) => subtask.id === subtaskId)) return task;
  return withSubtasks(
    task,
    current.filter((subtask) => subtask.id !== subtaskId),
    now,
  );
}

/** Swap a subtask with its neighbour. `null` when it is unknown or already at that end. */
export function moveSubtask(
  task: Task,
  subtaskId: string,
  direction: "up" | "down",
  now: Date,
): { task: Task; position: number; total: number } | null {
  const current = subtasksOf(task);
  const from = current.findIndex((subtask) => subtask.id === subtaskId);
  const to = direction === "up" ? from - 1 : from + 1;
  const moving = current[from];
  const neighbour = current[to];
  if (from < 0 || !moving || !neighbour) return null;

  const reordered = [...current];
  reordered[from] = neighbour;
  reordered[to] = moving;
  return { task: withSubtasks(task, reordered, now), position: to + 1, total: reordered.length };
}

export function progress(task: Task): Progress {
  const current = subtasksOf(task);
  return { done: current.filter((subtask) => subtask.done).length, total: current.length };
}

export function describeProgress({ done, total }: Progress): string {
  return `${done} of ${total} ${total === 1 ? "subtask" : "subtasks"} complete`;
}

/** A subtask that is not done, is due before `today`, and whose task is not completed. */
export function isSubtaskOverdue(subtask: Subtask, task: Task, today: string): boolean {
  return !subtask.done && task.status !== "completed" && subtask.dueDate !== null && subtask.dueDate < today;
}

/** Every subtask done, in the same order and with the same details. */
export function completeSubtasks(subtasks: Subtask[]): Subtask[] {
  return subtasks.map((subtask) => ({ ...subtask, done: true }));
}

/** Fresh copies for the next occurrence of a repeating task: new ids, none done. */
export function copySubtasks(subtasks: Subtask[], idPrefix: string): Subtask[] {
  return subtasks.map((subtask, index) => ({ ...subtask, id: `${idPrefix}:${index + 1}`, done: false }));
}

function isSubtask(value: unknown): value is Subtask {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    isPriority(value.priority) &&
    (value.dueDate === null || isCalendarDate(value.dueDate)) &&
    typeof value.done === "boolean"
  );
}

/** One to 50 valid subtasks with distinct ids. */
export function isSubtaskList(value: unknown): value is Subtask[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_SUBTASKS &&
    value.every(isSubtask) &&
    new Set(value.map((subtask) => subtask.id)).size === value.length
  );
}

/**
 * Before validating stored or imported data, remove a `subtasks` field that is not a valid list, so
 * one bad subtask never makes a whole document unreadable. The task keeps everything else. The
 * input is never changed.
 */
export function dropUnreadableSubtasks(value: unknown): unknown {
  if (!isRecord(value) || value.subtasks === undefined || isSubtaskList(value.subtasks)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "subtasks"));
}
