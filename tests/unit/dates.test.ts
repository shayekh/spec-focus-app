import { describe, expect, it } from "vitest";
import * as dates from "../../src/domain/dates";
import * as calendar from "../../src/domain/calendar";
import * as task from "../../src/domain/task";

describe("addDays", () => {
  it.each([
    ["2026-10-24", 1, "2026-10-25"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2024-02-28", 1, "2024-02-29"],
    ["2023-02-28", 1, "2023-03-01"],
    ["2026-10-25", -30, "2026-09-25"],
  ])("%s plus %i days is %s", (date, days, expected) => {
    expect(dates.addDays(date, days)).toBe(expected);
  });
});

describe("addMonths", () => {
  it.each([
    ["2026-01-31", 1, "2026-02-28"],
    ["2024-01-31", 1, "2024-02-29"],
    ["2026-12-15", 1, "2027-01-15"],
    ["2026-03-31", -1, "2026-02-28"],
  ])("%s plus %i months is %s", (date, months, expected) => {
    expect(dates.addMonths(date, months)).toBe(expected);
  });
});

describe("weekdays", () => {
  it("numbers Monday as 0 and Sunday as 6", () => {
    expect(dates.weekdayIndex("2026-10-19")).toBe(0);
    expect(dates.weekdayIndex("2026-10-25")).toBe(6);
  });

  it("finds the Monday that starts a week", () => {
    expect(dates.startOfWeek("2026-10-25")).toBe("2026-10-19");
    expect(dates.startOfWeek("2026-10-19")).toBe("2026-10-19");
  });
});

describe("daysInMonth and isSameMonth", () => {
  it("knows month lengths, including leap years", () => {
    expect(dates.daysInMonth(2024, 2)).toBe(29);
    expect(dates.daysInMonth(2026, 2)).toBe(28);
    expect(dates.daysInMonth(2100, 2)).toBe(28);
    expect(dates.daysInMonth(2026, 4)).toBe(30);
  });

  it("compares year and month", () => {
    expect(dates.isSameMonth("2026-10-01", "2026-10-31")).toBe(true);
    expect(dates.isSameMonth("2026-10-31", "2026-11-01")).toBe(false);
  });
});

describe("isCalendarDate", () => {
  it.each(["2026-10-25", "2024-02-29", "2026-12-31"])("accepts %s", (value) => {
    expect(dates.isCalendarDate(value)).toBe(true);
  });

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-00-10", "tomorrow", "", "2026-1-5", "2026-10-25T00:00"])(
    "rejects %j",
    (value) => {
      expect(dates.isCalendarDate(value)).toBe(false);
    },
  );

  it("rejects values that are not strings", () => {
    expect(dates.isCalendarDate(20261025)).toBe(false);
    expect(dates.isCalendarDate(null)).toBe(false);
    expect(dates.isCalendarDate(undefined)).toBe(false);
  });
});

describe("existing imports keep working", () => {
  it("calendar.ts re-exports the date functions", () => {
    for (const name of ["addDays", "addMonths", "weekdayIndex", "startOfWeek", "daysInMonth", "isSameMonth"] as const) {
      expect(calendar[name]).toBe(dates[name]);
    }
  });

  it("task.ts re-exports isCalendarDate", () => {
    expect(task.isCalendarDate).toBe(dates.isCalendarDate);
  });
});
