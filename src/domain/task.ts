export const PRIORITIES = ["low", "medium", "high"] as const;
export const STATUSES = ["todo", "in-progress", "completed"] as const;

export type Priority = (typeof PRIORITIES)[number];
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
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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
}

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
): TaskResult {
  const title = input.title.trim();
  if (title === "") return { ok: false, error: "Title is required." };

  const dueDate = normalizeDueDate(input.dueDate);
  if (dueDate === undefined) return { ok: false, error: "Due date is not a valid date." };

  const timestamp = now.toISOString();
  return {
    ok: true,
    task: {
      id,
      title,
      description: input.description ?? "",
      priority: input.priority ?? "medium",
      status: input.status ?? "todo",
      dueDate,
      tags: normalizeTags(input.tags ?? []),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

/** Apply edits to a task. Omitted fields keep their value; `dueDate: null` clears it. */
export function updateTask(task: Task, input: TaskInput, now: Date = new Date()): TaskResult {
  const result = createTask(
    {
      title: input.title,
      description: input.description ?? task.description,
      priority: input.priority ?? task.priority,
      status: input.status ?? task.status,
      dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate,
      tags: input.tags ?? task.tags,
    },
    now,
    task.id,
  );
  if (!result.ok) return result;
  return { ok: true, task: { ...result.task, createdAt: task.createdAt } };
}

export function completeTask(task: Task, now: Date = new Date()): Task {
  return { ...task, status: "completed", updatedAt: now.toISOString() };
}

/** Type guard for untrusted data (stored document or imported file). */
export function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
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
