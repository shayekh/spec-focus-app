/*
 * Date arithmetic on `YYYY-MM-DD` strings (calendar dates with no time zone). Everything happens
 * in UTC on whole days, so daylight-saving changes and the user's time zone can never move a date.
 * This module imports nothing, so any other domain module can use it without an import cycle.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function dateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 1, day: day ?? 1 };
}

export function toUtc(date: string): number {
  const { year, month, day } = dateParts(date);
  return Date.UTC(year, month - 1, day);
}

export function fromUtc(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Days in a month; `month` is 1 to 12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add whole months, keeping the day of the month unless the target month is shorter. */
export function addMonths(date: string, months: number): string {
  const { year, month, day } = dateParts(date);
  const total = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  return `${pad(targetYear, 4)}-${pad(targetMonth)}-${pad(Math.min(day, daysInMonth(targetYear, targetMonth)))}`;
}

/** Weekday with Monday as 0 and Sunday as 6. */
export function weekdayIndex(date: string): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}


const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
