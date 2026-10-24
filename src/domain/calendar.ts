import {
  addDays,
  addMonths,
  dateParts,
  daysInMonth,
  isSameMonth,
  pad,
  startOfWeek,
  toUtc,
  weekdayIndex,
} from "./dates";
import { isCalendarDate, type Priority, type Task } from "./task";

// The date functions live in dates.ts; they are re-exported here so existing imports keep working.
export { addDays, addMonths, daysInMonth, isSameMonth, startOfWeek, weekdayIndex };

/*
 * Calendar date logic. Dates are `YYYY-MM-DD` strings (calendar dates with no time zone). All
 * arithmetic happens in UTC on whole days, so daylight-saving changes and the user's time zone
 * can never move a task to another day.
 */

export type CalendarView = "month" | "week" | "day";

export interface CalendarState {
  view: CalendarView;
  /** The date the user is looking at. */
  anchor: string;
}

/** The month containing `anchor`, as whole Monday-to-Sunday rows of 7 dates. */
export function monthGrid(anchor: string): string[][] {
  const { year, month } = dateParts(anchor);
  const first = `${pad(year, 4)}-${pad(month)}-01`;
  const last = `${pad(year, 4)}-${pad(month)}-${pad(daysInMonth(year, month))}`;
  const start = startOfWeek(first);
  const end = addDays(last, 6 - weekdayIndex(last));
  const rows: string[][] = [];
  for (let rowStart = start; rowStart <= end; rowStart = addDays(rowStart, 7)) {
    rows.push(Array.from({ length: 7 }, (_, i) => addDays(rowStart, i)));
  }
  return rows;
}

/** The dates a view shows, in order. */
export function visibleDates(state: CalendarState): string[] {
  switch (state.view) {
    case "month":
      return monthGrid(state.anchor).flat();
    case "week": {
      const start = startOfWeek(state.anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    case "day":
      return [state.anchor];
  }
}

/** Move one month, week, or day, depending on the view. */
export function shift(state: CalendarState, direction: -1 | 1): CalendarState {
  switch (state.view) {
    case "month":
      return { ...state, anchor: addMonths(state.anchor, direction) };
    case "week":
      return { ...state, anchor: addDays(state.anchor, 7 * direction) };
    case "day":
      return { ...state, anchor: addDays(state.anchor, direction) };
  }
}

/** Change the view and keep the anchor, so the date the user was looking at stays in view. */
export function setView(state: CalendarState, view: CalendarView): CalendarState {
  return { ...state, view };
}

export function goToDate(state: CalendarState, anchor: string): CalendarState {
  return { ...state, anchor };
}

function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options });
}

const MONTH_YEAR = formatter({ month: "long", year: "numeric" });
const SHORT = formatter({ month: "short", day: "numeric" });
const SHORT_YEAR = formatter({ month: "short", day: "numeric", year: "numeric" });
const LONG_DAY = formatter({ weekday: "long", month: "long", day: "numeric", year: "numeric" });

/** A full, speakable description of a date, such as "Sunday, October 25, 2026". */
export function describeDate(date: string): string {
  return LONG_DAY.format(toUtc(date));
}

/** Text naming the period a view is showing. */
export function heading(state: CalendarState): string {
  switch (state.view) {
    case "month":
      return MONTH_YEAR.format(toUtc(state.anchor));
    case "week": {
      const start = startOfWeek(state.anchor);
      const end = addDays(start, 6);
      if (dateParts(start).year !== dateParts(end).year) {
        return `${SHORT_YEAR.format(toUtc(start))} to ${SHORT_YEAR.format(toUtc(end))}`;
      }
      return `${SHORT.format(toUtc(start))} to ${SHORT.format(toUtc(end))}, ${dateParts(end).year}`;
    }
    case "day":
      return describeDate(state.anchor);
  }
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function compareEntries(a: Task, b: Task): number {
  const completed = Number(a.status === "completed") - Number(b.status === "completed");
  if (completed !== 0) return completed;
  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority !== 0) return priority;
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

/**
 * Tasks grouped by due date. Tasks with no due date are left out. Within a date: not completed
 * first, then high to low priority, then by title.
 */
export function entriesByDate(tasks: Task[]): Map<string, Task[]> {
  const byDate = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.dueDate === null) continue;
    const list = byDate.get(task.dueDate);
    if (list) list.push(task);
    else byDate.set(task.dueDate, [task]);
  }
  for (const list of byDate.values()) list.sort(compareEntries);
  return byDate;
}

/**
 * Give a task a new due date. Returns the same object when nothing changes (the date is the same
 * or is not a real calendar date), so callers can skip saving.
 */
export function rescheduleTask(task: Task, date: string, now: Date = new Date()): Task {
  if (!isCalendarDate(date) || task.dueDate === date) return task;
  return { ...task, dueDate: date, updatedAt: now.toISOString() };
}

/** Where an arrow key moves the target date of a keyboard move, or null for other keys. */
export function moveTarget(date: string, key: string): string | null {
  switch (key) {
    case "ArrowLeft":
      return addDays(date, -1);
    case "ArrowRight":
      return addDays(date, 1);
    case "ArrowUp":
      return addDays(date, -7);
    case "ArrowDown":
      return addDays(date, 7);
    default:
      return null;
  }
}
