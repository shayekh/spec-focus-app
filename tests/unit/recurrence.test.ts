import { describe, expect, it } from "vitest";
import {
  buildRule,
  datesBetween,
  describeRecurrence,
  explainRepeat,
  isRecurrence,
  nextDate,
  validateRecurrence,
  type Recurrence,
} from "../../src/domain/recurrence";
import { addDays, daysInMonth, weekdayIndex } from "../../src/domain/dates";

const daily: Recurrence = { kind: "daily", weekdays: [], dayOfMonth: null, endDate: null };
const weeklyThu: Recurrence = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: null };
const monthly31: Recurrence = { kind: "monthly", weekdays: [], dayOfMonth: 31, endDate: null };
const monWedFri: Recurrence = { kind: "days", weekdays: [0, 2, 4], dayOfMonth: null, endDate: null };
const withEnd = (rule: Recurrence, endDate: string): Recurrence => ({ ...rule, endDate });

describe("nextDate", () => {
  it("daily is the next day", () => {
    expect(nextDate(daily, "2026-10-15")).toBe("2026-10-16");
    expect(nextDate(daily, "2026-12-31")).toBe("2027-01-01");
    expect(nextDate(daily, "2024-02-28")).toBe("2024-02-29");
    expect(nextDate(daily, "2024-02-29")).toBe("2024-03-01");
  });

  it("weekly is the next matching weekday, strictly after the given date", () => {
    // 2026-10-15 is a Thursday.
    expect(nextDate(weeklyThu, "2026-10-15")).toBe("2026-10-22");
    expect(nextDate(weeklyThu, "2026-10-16")).toBe("2026-10-22");
    expect(nextDate(weeklyThu, "2026-10-21")).toBe("2026-10-22");
    expect(nextDate(weeklyThu, "2026-10-22")).toBe("2026-10-29");
  });

  it("selected days picks the next chosen weekday, wrapping into the next week", () => {
    // Mon, Wed, Fri. 2026-10-16 is a Friday.
    expect(nextDate(monWedFri, "2026-10-16")).toBe("2026-10-19");
    expect(nextDate(monWedFri, "2026-10-19")).toBe("2026-10-21");
    expect(nextDate(monWedFri, "2026-10-21")).toBe("2026-10-23");
    expect(nextDate(monWedFri, "2026-10-17")).toBe("2026-10-19"); // from a Saturday
  });

  it("selected days with a single day behaves like weekly", () => {
    const single: Recurrence = { kind: "days", weekdays: [3], dayOfMonth: null, endDate: null };
    expect(nextDate(single, "2026-10-15")).toBe("2026-10-22");
  });

  it("monthly uses the day of the month, clamped to short months and restored in long ones", () => {
    expect(nextDate(monthly31, "2026-01-31")).toBe("2026-02-28");
    expect(nextDate(monthly31, "2026-02-28")).toBe("2026-03-31");
    expect(nextDate(monthly31, "2026-03-31")).toBe("2026-04-30");
    expect(nextDate(monthly31, "2026-04-30")).toBe("2026-05-31");
    expect(nextDate(monthly31, "2024-01-31")).toBe("2024-02-29");
    expect(nextDate(monthly31, "2026-12-31")).toBe("2027-01-31");
  });

  it("monthly on a mid-month day moves to the same day next month", () => {
    const fifteenth: Recurrence = { kind: "monthly", weekdays: [], dayOfMonth: 15, endDate: null };
    expect(nextDate(fifteenth, "2026-10-15")).toBe("2026-11-15");
    expect(nextDate(fifteenth, "2026-10-10")).toBe("2026-10-15");
    expect(nextDate(fifteenth, "2026-12-20")).toBe("2027-01-15");
  });

  it("monthly on 29 February style days uses the last day of short Februaries", () => {
    const twentyNinth: Recurrence = { kind: "monthly", weekdays: [], dayOfMonth: 29, endDate: null };
    expect(nextDate(twentyNinth, "2026-01-29")).toBe("2026-02-28");
    expect(nextDate(twentyNinth, "2024-01-29")).toBe("2024-02-29");
    expect(nextDate(twentyNinth, "2026-02-28")).toBe("2026-03-29");
  });

  it("returns null once the next date is after the end date, and allows the end date itself", () => {
    expect(nextDate(withEnd(daily, "2026-10-16"), "2026-10-15")).toBe("2026-10-16");
    expect(nextDate(withEnd(daily, "2026-10-16"), "2026-10-16")).toBeNull();
    expect(nextDate(withEnd(weeklyThu, "2026-10-21"), "2026-10-15")).toBeNull();
    expect(nextDate(withEnd(weeklyThu, "2026-10-22"), "2026-10-15")).toBe("2026-10-22");
  });

  it("depends only on the rule and the date given, not on how the date was reached", () => {
    // Any date between two Thursdays has the same next date.
    expect(nextDate(weeklyThu, "2026-11-06")).toBe("2026-11-12");
    expect(nextDate(weeklyThu, "2026-11-11")).toBe("2026-11-12");
    // Stepping through occurrences one at a time lands where a direct question does.
    let stepped = "2026-10-15";
    for (let i = 0; i < 4; i++) stepped = nextDate(weeklyThu, stepped) ?? "";
    expect(stepped).toBe("2026-11-12");
    expect(nextDate(weeklyThu, "2026-11-05")).toBe(stepped);
  });
});

describe("24 months of completions", () => {
  /** Independent day-by-day reference: the first date after `after` that satisfies the rule. */
  function reference(rule: Recurrence, after: string): string {
    for (let i = 1; i <= 400; i++) {
      const date = addDays(after, i);
      const [y, m, d] = date.split("-").map(Number) as [number, number, number];
      if (rule.kind === "daily") return date;
      if (rule.kind === "weekly" || rule.kind === "days") {
        if (rule.weekdays.includes(weekdayIndex(date))) return date;
      } else {
        const wanted = Math.min(rule.dayOfMonth ?? 1, daysInMonth(y, m));
        if (d === wanted) return date;
      }
    }
    throw new Error("no date found");
  }

  const rules: [string, Recurrence, string][] = [
    ["daily", daily, "2026-01-31"],
    ["weekly", weeklyThu, "2026-01-01"],
    ["monthly on the 31st", monthly31, "2026-01-31"],
    ["monthly on the 30th", { kind: "monthly", weekdays: [], dayOfMonth: 30, endDate: null }, "2026-01-30"],
    ["selected days", monWedFri, "2026-01-02"],
  ];

  it.each(rules)("%s matches an independent calculation for 24 months", (_name, rule, start) => {
    let current = start;
    const limit = addDays(start, 730);
    let steps = 0;
    while (current < limit) {
      const next = nextDate(rule, current);
      expect(next, `after ${current}`).toBe(reference(rule, current));
      current = next ?? limit;
      steps++;
    }
    expect(steps).toBeGreaterThan(20);
  });
});

describe("datesBetween", () => {
  it("lists the rule's dates inside the range, after the given date", () => {
    expect(datesBetween(weeklyThu, "2026-10-15", "2026-10-01", "2026-11-12")).toEqual([
      "2026-10-22",
      "2026-10-29",
      "2026-11-05",
      "2026-11-12",
    ]);
  });

  it("leaves out dates before the range and the date it starts from", () => {
    expect(datesBetween(daily, "2026-10-15", "2026-10-18", "2026-10-20")).toEqual([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
    ]);
    expect(datesBetween(daily, "2026-10-15", "2026-10-15", "2026-10-16")).toEqual(["2026-10-16"]);
  });

  it("stops at the end date", () => {
    expect(datesBetween(withEnd(weeklyThu, "2026-11-01"), "2026-10-15", "2026-10-01", "2026-12-31")).toEqual([
      "2026-10-22",
      "2026-10-29",
    ]);
  });

  it("gives the same dates for a series that began years ago without walking its whole history", () => {
    const old = datesBetween(weeklyThu, "2020-01-02", "2026-10-01", "2026-10-31");
    expect(old).toEqual(["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29"]);
    const monthly = datesBetween(monthly31, "2020-01-31", "2026-10-01", "2026-11-30");
    expect(monthly).toEqual(["2026-10-31", "2026-11-30"]);
  });

  it("returns nothing when the range is entirely before the starting date", () => {
    expect(datesBetween(daily, "2026-10-15", "2026-09-01", "2026-10-10")).toEqual([]);
  });

  it("never returns more than 400 dates", () => {
    expect(datesBetween(daily, "2026-01-01", "2026-01-02", "2030-01-01")).toHaveLength(400);
  });
});

describe("describeRecurrence", () => {
  it.each([
    [daily, "Repeats daily"],
    [weeklyThu, "Repeats weekly on Thursday"],
    [monthly31, "Repeats monthly on the 31st"],
    [monWedFri, "Repeats Mon, Wed, Fri"],
    [{ ...monthly31, dayOfMonth: 1 }, "Repeats monthly on the 1st"],
    [{ ...monthly31, dayOfMonth: 2 }, "Repeats monthly on the 2nd"],
    [{ ...monthly31, dayOfMonth: 3 }, "Repeats monthly on the 3rd"],
    [{ ...monthly31, dayOfMonth: 11 }, "Repeats monthly on the 11th"],
    [{ ...monthly31, dayOfMonth: 22 }, "Repeats monthly on the 22nd"],
    [withEnd(daily, "2026-12-31"), "Repeats daily until Dec 31, 2026"],
    [withEnd(monWedFri, "2027-01-05"), "Repeats Mon, Wed, Fri until Jan 5, 2027"],
  ])("describes %j as %s", (rule, text) => {
    expect(describeRecurrence(rule)).toBe(text);
  });
});

describe("validateRecurrence", () => {
  it("accepts a valid rule with a due date", () => {
    expect(validateRecurrence(weeklyThu, "2026-10-15")).toEqual({});
    expect(validateRecurrence(withEnd(weeklyThu, "2026-10-15"), "2026-10-15")).toEqual({});
  });

  it("needs a due date", () => {
    expect(validateRecurrence(weeklyThu, null)).toEqual({
      dueDate: "Choose a due date to start the repeat from.",
    });
  });

  it("needs at least one chosen day for selected days", () => {
    expect(validateRecurrence({ ...monWedFri, weekdays: [] }, "2026-10-15")).toEqual({
      days: "Choose at least one day.",
    });
  });

  it("rejects an end date that is not a real date or is before the due date", () => {
    expect(validateRecurrence(withEnd(daily, "2026-02-30"), "2026-10-15")).toEqual({
      endDate: "End date is not a valid date.",
    });
    expect(validateRecurrence(withEnd(daily, "2026-10-14"), "2026-10-15")).toEqual({
      endDate: "End date cannot be earlier than the due date.",
    });
  });

  it("reports every problem at once", () => {
    expect(validateRecurrence({ ...monWedFri, weekdays: [], endDate: "nope" }, null)).toEqual({
      dueDate: "Choose a due date to start the repeat from.",
      days: "Choose at least one day.",
      endDate: "End date is not a valid date.",
    });
  });
});

describe("buildRule", () => {
  it("takes the weekday from the due date for weekly", () => {
    expect(buildRule({ kind: "weekly", dueDate: "2026-10-15", days: [], endDate: null })).toEqual(weeklyThu);
  });

  it("takes the day of the month from the due date for monthly", () => {
    expect(buildRule({ kind: "monthly", dueDate: "2026-01-31", days: [], endDate: null })).toEqual(monthly31);
  });

  it("uses the chosen days for selected days, sorted and without repeats", () => {
    expect(buildRule({ kind: "days", dueDate: "2026-10-15", days: [4, 0, 2, 0], endDate: null })).toEqual(monWedFri);
  });

  it("has no anchor for daily", () => {
    expect(buildRule({ kind: "daily", dueDate: "2026-10-15", days: [3], endDate: null })).toEqual(daily);
  });

  it("keeps the stored anchor when the kind and days are unchanged, but takes the new end date", () => {
    const stored = withEnd(weeklyThu, "2026-12-01");
    const rebuilt = buildRule({
      kind: "weekly",
      dueDate: "2026-10-20", // a Tuesday: the due date was moved, the pattern must not
      days: [],
      endDate: "2027-01-01",
      existing: stored,
    });
    expect(rebuilt).toEqual({ ...weeklyThu, endDate: "2027-01-01" });
  });

  it("re-derives the anchor when the kind changes", () => {
    const rebuilt = buildRule({
      kind: "weekly",
      dueDate: "2026-10-20",
      days: [],
      endDate: null,
      existing: monthly31,
    });
    expect(rebuilt).toEqual({ kind: "weekly", weekdays: [1], dayOfMonth: null, endDate: null });
  });

  it("uses the new days for selected days when they differ from the stored ones", () => {
    const rebuilt = buildRule({
      kind: "days",
      dueDate: "2026-10-15",
      days: [1, 3],
      endDate: null,
      existing: monWedFri,
    });
    expect(rebuilt.weekdays).toEqual([1, 3]);
  });
});

describe("isRecurrence", () => {
  it("accepts every valid shape", () => {
    for (const rule of [daily, weeklyThu, monthly31, monWedFri, withEnd(daily, "2026-12-31")]) {
      expect(isRecurrence(rule)).toBe(true);
    }
  });

  it.each([
    ["not an object", "weekly"],
    ["null", null],
    ["an array", []],
    ["an unknown kind", { ...daily, kind: "yearly" }],
    ["weekdays out of range", { ...weeklyThu, weekdays: [7] }],
    ["a fractional weekday", { ...weeklyThu, weekdays: [1.5] }],
    ["duplicate weekdays", { ...monWedFri, weekdays: [0, 0] }],
    ["weekdays not an array", { ...weeklyThu, weekdays: 3 }],
    ["weekly with two weekdays", { ...weeklyThu, weekdays: [1, 2] }],
    ["weekly with no weekday", { ...weeklyThu, weekdays: [] }],
    ["days with none", { ...monWedFri, weekdays: [] }],
    ["daily with weekdays", { ...daily, weekdays: [1] }],
    ["monthly without a day", { ...monthly31, dayOfMonth: null }],
    ["monthly day 0", { ...monthly31, dayOfMonth: 0 }],
    ["monthly day 32", { ...monthly31, dayOfMonth: 32 }],
    ["weekly with a day of month", { ...weeklyThu, dayOfMonth: 5 }],
    ["monthly with weekdays", { ...monthly31, weekdays: [1] }],
    ["a bad end date", { ...daily, endDate: "2026-02-30" }],
    ["an end date that is not text", { ...daily, endDate: 5 }],
    ["a missing end date field", { kind: "daily", weekdays: [], dayOfMonth: null }],
  ])("rejects %s", (_name, value) => {
    expect(isRecurrence(value)).toBe(false);
  });
});

describe("explainRepeat", () => {
  it("says which weekday a weekly repeat falls on, from the due date", () => {
    expect(explainRepeat("weekly", "2026-10-15")).toBe("Repeats every week on Thursday.");
    expect(explainRepeat("weekly", "2026-10-19")).toBe("Repeats every week on Monday.");
  });

  it("says which day of the month a monthly repeat falls on", () => {
    expect(explainRepeat("monthly", "2026-10-15")).toBe("Repeats on the 15th of every month.");
    expect(explainRepeat("monthly", "2026-10-01")).toBe("Repeats on the 1st of every month.");
    expect(explainRepeat("monthly", "2026-10-22")).toBe("Repeats on the 22nd of every month.");
  });

  it("explains that late days use the last day of shorter months", () => {
    for (const date of ["2026-10-29", "2026-10-30", "2026-10-31"]) {
      expect(explainRepeat("monthly", date)).toMatch(/or the last day of shorter months\.$/);
    }
    expect(explainRepeat("monthly", "2026-10-31")).toBe(
      "Repeats on the 31st of every month, or the last day of shorter months.",
    );
    expect(explainRepeat("monthly", "2026-10-28")).not.toMatch(/shorter/);
  });

  it("has nothing to say without a due date, or for daily and selected days", () => {
    expect(explainRepeat("weekly", null)).toBeNull();
    expect(explainRepeat("monthly", null)).toBeNull();
    expect(explainRepeat("daily", "2026-10-15")).toBeNull();
    expect(explainRepeat("days", "2026-10-15")).toBeNull();
    expect(explainRepeat("none", "2026-10-15")).toBeNull();
  });
});
