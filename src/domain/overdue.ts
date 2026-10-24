import type { Task } from "./task";

/** Local calendar date as YYYY-MM-DD. */
export function todayString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A task is overdue when its due date is before today and it is not completed. */
export function isOverdue(task: Task, today: string): boolean {
  return task.dueDate !== null && task.status !== "completed" && task.dueDate < today;
}
