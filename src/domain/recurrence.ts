import { addDays, addMonths, dateParts, daysInMonth, isCalendarDate, pad, toUtc, weekdayIndex } from "./dates";
import { isRecord } from "./guards";

/*
 * Repeat rules. A rule says which dates a recurring task falls on. It is memoryless: the next date
 * depends only on the rule and the date given, never on earlier occurrences. Weekdays are numbers
 * with Monday as 0 and Sunday as 6.
 */

export type RecurrenceKind = "daily" | "weekly" | "monthly" | "days";

export interface Recurrence {
  kind: RecurrenceKind;
  /** `weekly`: exactly one. `days`: one or more. Empty for `daily` and `monthly`. */
  weekdays: number[];
  /** `monthly`: 1 to 31. `null` for every other kind. */
  dayOfMonth: number | null;
  /** The last date an occurrence can fall on, or `null` for no end. */
  endDate: string | null;
}

export const RECURRENCE_KINDS: readonly RecurrenceKind[] = ["daily", "weekly", "monthly", "days"];

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Longest list of dates `datesBetween` returns, so a very wide range cannot freeze the page. */
const MAX_DATES = 400;

function isKind(value: unknown): value is RecurrenceKind {
  return RECURRENCE_KINDS.some((kind) => kind === value);
}

function isWeekdayList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    new Set(value).size === value.length
  );
}

/** Type guard for untrusted data (stored document or imported file). */
export function isRecurrence(value: unknown): value is Recurrence {
  if (!isRecord(value)) return false;
  const { kind, weekdays, dayOfMonth, endDate } = value;
  if (!isKind(kind) || !isWeekdayList(weekdays)) return false;
  if (endDate !== null && !isCalendarDate(endDate)) return false;

  switch (kind) {
    case "daily":
      return weekdays.length === 0 && dayOfMonth === null;
    case "weekly":
      return weekdays.length === 1 && dayOfMonth === null;
    case "days":
      return weekdays.length >= 1 && dayOfMonth === null;
    case "monthly":
      return weekdays.length === 0 && typeof dayOfMonth === "number" && Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31;
  }
}

function monthDate(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(Math.min(day, daysInMonth(year, month)))}`;
}

function nextMonthly(dayOfMonth: number, after: string): string {
  const { year, month } = dateParts(after);
  const sameMonth = monthDate(year, month, dayOfMonth);
  if (sameMonth > after) return sameMonth;
  const following = dateParts(addMonths(`${pad(year, 4)}-${pad(month)}-01`, 1));
  return monthDate(following.year, following.month, dayOfMonth);
}

function nextMatchingWeekday(weekdays: number[], after: string): string | null {
  for (let step = 1; step <= 7; step++) {
    const date = addDays(after, step);
    if (weekdays.includes(weekdayIndex(date))) return date;
  }
  return null;
}

/**
 * The first date the rule produces strictly after `after`, or `null` when there is none (the next
 * date would be after the end date).
 */
export function nextDate(rule: Recurrence, after: string): string | null {
  let candidate: string | null;
  switch (rule.kind) {
    case "daily":
      candidate = addDays(after, 1);
      break;
    case "weekly":
    case "days":
      candidate = nextMatchingWeekday(rule.weekdays, after);
      break;
    case "monthly":
      candidate = nextMonthly(rule.dayOfMonth ?? 1, after);
      break;
  }
  if (candidate === null) return null;
  return rule.endDate !== null && candidate > rule.endDate ? null : candidate;
}

/**
 * The dates the rule produces after `after` that lie in `[from, to]`. Because the rule has no
 * memory, the walk starts at `max(after, from - 1 day)`, so an old series costs only the range.
 */
export function datesBetween(rule: Recurrence, after: string, from: string, to: string): string[] {
  const dates: string[] = [];
  const dayBeforeRange = addDays(from, -1);
  let cursor = after < dayBeforeRange ? dayBeforeRange : after;
  while (dates.length < MAX_DATES) {
    const next = nextDate(rule, cursor);
    if (next === null || next > to) break;
    dates.push(next);
    cursor = next;
  }
  return dates;
}

function ordinal(day: number): string {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

const END_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** A short sentence for lists and labels, such as "Repeats weekly on Thursday until Dec 31, 2026". */
export function describeRecurrence(rule: Recurrence): string {
  let text: string;
  switch (rule.kind) {
    case "daily":
      text = "Repeats daily";
      break;
    case "weekly":
      text = `Repeats weekly on ${WEEKDAY_NAMES[rule.weekdays[0] ?? 0] ?? ""}`;
      break;
    case "monthly":
      text = `Repeats monthly on the ${ordinal(rule.dayOfMonth ?? 1)}`;
      break;
    case "days":
      text = `Repeats ${[...rule.weekdays]
        .sort((a, b) => a - b)
        .map((day) => WEEKDAY_SHORT[day] ?? "")
        .join(", ")}`;
      break;
  }
  return rule.endDate === null ? text : `${text} until ${END_DATE_FORMAT.format(toUtc(rule.endDate))}`;
}

/**
 * A sentence for the form that says what a repeat will do, worked out from the due date, or `null`
 * when there is nothing useful to say (no due date, or a kind that explains itself).
 */
export function explainRepeat(choice: "none" | RecurrenceKind, dueDate: string | null): string | null {
  if (dueDate === null || !isCalendarDate(dueDate)) return null;
  if (choice === "weekly") {
    return `Repeats every week on ${WEEKDAY_NAMES[weekdayIndex(dueDate)] ?? ""}.`;
  }
  if (choice === "monthly") {
    const day = dateParts(dueDate).day;
    const base = `Repeats on the ${ordinal(day)} of every month`;
    return day >= 29 ? `${base}, or the last day of shorter months.` : `${base}.`;
  }
  return null;
}

export interface RecurrenceErrors {
  dueDate?: string;
  days?: string;
  endDate?: string;
}

/** Problems with a rule, by field. An empty object means the rule is fine. */
export function validateRecurrence(rule: Recurrence, dueDate: string | null): RecurrenceErrors {
  const errors: RecurrenceErrors = {};
  if (dueDate === null) errors.dueDate = "Choose a due date to start the repeat from.";
  if (rule.kind === "days" && rule.weekdays.length === 0) errors.days = "Choose at least one day.";
  if (rule.endDate !== null) {
    if (!isCalendarDate(rule.endDate)) errors.endDate = "End date is not a valid date.";
    else if (dueDate !== null && rule.endDate < dueDate) {
      errors.endDate = "End date cannot be earlier than the due date.";
    }
  }
  return errors;
}

export interface BuildRuleOptions {
  kind: RecurrenceKind;
  dueDate: string | null;
  /** The days chosen for `days` rules. */
  days: number[];
  endDate: string | null;
  /** The rule being edited, if any. Its anchor is kept when the kind and days are unchanged. */
  existing?: Recurrence | null;
}

function sameDays(a: number[], b: number[]): boolean {
  const left = [...new Set(a)].sort((x, y) => x - y);
  const right = [...new Set(b)].sort((x, y) => x - y);
  return left.length === right.length && left.every((day, i) => day === right[i]);
}

/**
 * Make a rule from the form's choices. A weekly rule takes its weekday and a monthly rule its day
 * of the month from the due date, but when an existing rule of the same kind is being edited its
 * anchor is kept, so moving one occurrence never moves the pattern.
 */
export function buildRule({ kind, dueDate, days, endDate, existing }: BuildRuleOptions): Recurrence {
  const keep = existing && existing.kind === kind ? existing : null;
  const due = dueDate === null ? null : dateParts(dueDate);

  switch (kind) {
    case "daily":
      return { kind, weekdays: [], dayOfMonth: null, endDate };
    case "weekly": {
      const weekdays = keep ? keep.weekdays : [dueDate === null ? 0 : weekdayIndex(dueDate)];
      return { kind, weekdays, dayOfMonth: null, endDate };
    }
    case "monthly": {
      const dayOfMonth = keep ? keep.dayOfMonth : due ? due.day : 1;
      return { kind, weekdays: [], dayOfMonth, endDate };
    }
    case "days": {
      const chosen = keep && sameDays(days, keep.weekdays) ? keep.weekdays : [...new Set(days)].sort((a, b) => a - b);
      return { kind, weekdays: chosen, dayOfMonth: null, endDate };
    }
  }
}
