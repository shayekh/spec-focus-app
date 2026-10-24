import { isTask, type Task } from "../domain/task";

export const TASKS_KEY = "focus-app:tasks";
export const STORAGE_VERSION = 1;

export interface LoadResult {
  tasks: Task[];
  /** Set when stored data existed but could not be used. */
  notice: string | null;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

const UNREADABLE_NOTICE =
  "Your saved tasks could not be read, so Focus App started with an empty list.";

export function loadTasks(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(TASKS_KEY);
  } catch {
    return { tasks: [], notice: UNREADABLE_NOTICE };
  }
  if (raw === null) return { tasks: [], notice: null };

  try {
    const doc: unknown = JSON.parse(raw);
    if (
      typeof doc === "object" &&
      doc !== null &&
      (doc as { version?: unknown }).version === STORAGE_VERSION &&
      Array.isArray((doc as { tasks?: unknown }).tasks) &&
      (doc as { tasks: unknown[] }).tasks.every(isTask)
    ) {
      return { tasks: (doc as { tasks: Task[] }).tasks, notice: null };
    }
  } catch {
    // fall through to the notice below
  }
  return { tasks: [], notice: UNREADABLE_NOTICE };
}

export function saveTasks(tasks: Task[]): SaveResult {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Your changes could not be saved in this browser. Export your tasks to keep a copy.",
    };
  }
}
