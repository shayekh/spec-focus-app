import type { Priority, Status, Task } from "./task";

export type SortKey = "created" | "dueDate" | "priority";

export interface Query {
  status: Status | "all";
  priority: Priority | "all";
  tag: string;
  search: string;
  sort: SortKey;
}

export const DEFAULT_QUERY: Query = {
  status: "all",
  priority: "all",
  tag: "all",
  search: "",
  sort: "created",
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function hasTag(task: Task, tag: string): boolean {
  const key = tag.toLowerCase();
  return task.tags.some((t) => t.toLowerCase() === key);
}

/** Status, priority, and tag filters, combined with AND. */
export function filterTasks(tasks: Task[], query: Query): Task[] {
  return tasks.filter(
    (task) =>
      (query.status === "all" || task.status === query.status) &&
      (query.priority === "all" || task.priority === query.priority) &&
      (query.tag === "all" || hasTag(task, query.tag)),
  );
}

/** Case-insensitive substring match on title or description. */
export function searchTasks(tasks: Task[], search: string): Task[] {
  const needle = search.trim().toLowerCase();
  if (needle === "") return tasks;
  return tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(needle) ||
      task.description.toLowerCase().includes(needle),
  );
}

/** Unique tags across all tasks (case-insensitive), first spelling kept, sorted A to Z. */
export function deriveTags(tasks: Task[]): string[] {
  const byKey = new Map<string, string>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      const key = tag.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, tag);
    }
  }
  return Array.from(byKey.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, tag]) => tag);
}

function newestFirst(a: Task, b: Task): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export function sortTasks(tasks: Task[], sort: SortKey): Task[] {
  const copy = [...tasks];
  switch (sort) {
    case "created":
      return copy.sort(newestFirst);
    case "dueDate":
      return copy.sort((a, b) => {
        if (a.dueDate === b.dueDate) return newestFirst(a, b);
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    case "priority":
      return copy.sort(
        (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || newestFirst(a, b),
      );
  }
}

export function applyQuery(tasks: Task[], query: Query): Task[] {
  return sortTasks(searchTasks(filterTasks(tasks, query), query.search), query.sort);
}

/** Reset the tag filter to "all" when no task carries the selected tag any more. */
export function reconcileQuery(query: Query, tasks: Task[]): Query {
  if (query.tag === "all") return query;
  return tasks.some((task) => hasTag(task, query.tag)) ? query : { ...query, tag: "all" };
}
