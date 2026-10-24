import { buildRule, validateRecurrence, type Recurrence, type RecurrenceKind } from "./recurrence";
import {
  isCalendarDate,
  normalizeTags,
  type Priority,
  type Status,
  type Task,
  type TaskInput,
} from "./task";

/** How the form says a task repeats. */
export type RepeatChoice = "none" | RecurrenceKind;

/** The values currently shown in the task form. Exists only while the form is open. */
export interface FormValues {
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  /** YYYY-MM-DD, or "" for no due date (matches a date input). */
  dueDate: string;
  /** Comma-separated text as typed. */
  tags: string;
  repeat: RepeatChoice;
  /** The weekdays ticked for "On selected days" (Monday is 0). Only used when `repeat` is "days". */
  repeatDays: number[];
  /** YYYY-MM-DD, or "" for no end date. Only used when the task repeats. */
  repeatUntil: string;
}

export interface FormErrors {
  title?: string;
  dueDate?: string;
  repeatDays?: string;
  repeatUntil?: string;
}

/** Initial values: a task's saved values, or the defaults for a new task. */
export function toFormValues(task?: Task): FormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "medium",
    status: task?.status ?? "todo",
    dueDate: task?.dueDate ?? "",
    tags: task?.tags.join(", ") ?? "",
    repeat: task?.recurrence?.kind ?? "none",
    repeatDays: task?.recurrence?.kind === "days" ? [...task.recurrence.weekdays] : [],
    repeatUntil: task?.recurrence?.endDate ?? "",
  };
}

function parseTags(text: string): string[] {
  return normalizeTags(text.split(","));
}

/**
 * The input handed to `createTask` or `updateTask`. `existing` is the rule being edited, so that a
 * rule whose kind and days are unchanged keeps its anchor (see `buildRule`).
 */
export function toTaskInput(values: FormValues, existing: Recurrence | null = null): TaskInput {
  return {
    title: values.title,
    description: values.description,
    priority: values.priority,
    status: values.status,
    dueDate: values.dueDate === "" ? null : values.dueDate,
    tags: parseTags(values.tags),
    recurrence:
      values.repeat === "none"
        ? null
        : buildRule({
            kind: values.repeat,
            dueDate: values.dueDate === "" ? null : values.dueDate,
            days: values.repeatDays,
            endDate: values.repeatUntil === "" ? null : values.repeatUntil,
            existing,
          }),
  };
}

/** What matters about the repeat choice: ticked days only count for "On selected days". */
function repeatKey(values: FormValues): string {
  if (values.repeat === "none") return "none";
  const days = values.repeat === "days" ? [...new Set(values.repeatDays)].sort((a, b) => a - b).join(",") : "";
  return [values.repeat, days, values.repeatUntil].join("|");
}

/**
 * True when `current` really differs from `initial`. Surrounding whitespace and tag spacing or
 * repeated tags do not count, so changing a value and changing it back is not a change.
 */
export function isDirty(initial: FormValues, current: FormValues): boolean {
  const a = parseTags(initial.tags);
  const b = parseTags(current.tags);
  return (
    initial.title.trim() !== current.title.trim() ||
    initial.description.trim() !== current.description.trim() ||
    initial.priority !== current.priority ||
    initial.status !== current.status ||
    initial.dueDate !== current.dueDate ||
    a.length !== b.length ||
    a.some((tag, i) => tag !== b[i]) ||
    repeatKey(initial) !== repeatKey(current)
  );
}

export function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.title.trim() === "") errors.title = "Title is required.";
  if (values.dueDate !== "" && !isCalendarDate(values.dueDate)) {
    errors.dueDate = "Due date is not a valid date.";
  }

  if (values.repeat !== "none") {
    const dueDate = values.dueDate !== "" && isCalendarDate(values.dueDate) ? values.dueDate : null;
    const problems = validateRecurrence(
      buildRule({
        kind: values.repeat,
        dueDate,
        days: values.repeatDays,
        endDate: values.repeatUntil === "" ? null : values.repeatUntil,
      }),
      dueDate,
    );
    // A due date that is present but not a real date already has its own message above.
    if (problems.dueDate && values.dueDate === "") errors.dueDate = problems.dueDate;
    if (problems.days) errors.repeatDays = problems.days;
    if (problems.endDate) errors.repeatUntil = problems.endDate;
  }
  return errors;
}
