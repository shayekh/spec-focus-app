import { repairStoredTask, isRecord, isTask, type Task } from "../domain/task";

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
    if (isRecord(doc) && doc.version === STORAGE_VERSION) {
      const stored: unknown = doc.tasks;
      // A task whose repeat rule cannot be read becomes an ordinary task instead of failing the load.
      const tasks = Array.isArray(stored) ? stored.map(repairStoredTask) : stored;
      if (Array.isArray(tasks) && tasks.every(isTask)) return { tasks, notice: null };
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
