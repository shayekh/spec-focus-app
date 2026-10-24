import { useCallback, useEffect, useRef, useState } from "react";
import type { Task } from "../domain/task";
import { subscribeToTaskChanges } from "../storage/crossTab";
import { loadTasks, saveTasks } from "../storage/taskStore";

export type TaskAction =
  | { type: "add"; task: Task }
  | { type: "update"; task: Task }
  | { type: "delete"; id: string }
  | { type: "replaceAll"; tasks: Task[] };

export function tasksReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case "add":
      return [action.task, ...tasks];
    case "update":
      return tasks.map((t) => (t.id === action.task.id ? action.task : t));
    case "delete":
      return tasks.filter((t) => t.id !== action.id);
    case "replaceAll":
      return action.tasks;
  }
}

export interface UseTasks {
  tasks: Task[];
  notice: string | null;
  dismissNotice: () => void;
  dispatch: (action: TaskAction) => void;
  /** Replace the in-memory list with whatever storage currently holds (no write). */
  reloadFromStorage: () => void;
}

export function useTasks(): UseTasks {
  const [initial] = useState(loadTasks);
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [notice, setNotice] = useState<string | null>(initial.notice);
  const current = useRef(tasks);

  const dispatch = useCallback((action: TaskAction) => {
    const next = tasksReducer(current.current, action);
    current.current = next;
    setTasks(next);
    const result = saveTasks(next);
    if (!result.ok) setNotice(result.error);
  }, []);

  const reloadFromStorage = useCallback(() => {
    const loaded = loadTasks();
    current.current = loaded.tasks;
    setTasks(loaded.tasks);
    setNotice(loaded.notice);
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  // Last write wins: whatever another tab saved replaces our in-memory list.
  useEffect(() => subscribeToTaskChanges(reloadFromStorage), [reloadFromStorage]);

  return { tasks, notice, dismissNotice, dispatch, reloadFromStorage };
}
