import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysInMonth,
  entriesByDate,
  goToDate,
  heading,
  isSameMonth,
  monthGrid,
  moveTarget,
  rescheduleTask,
  setView,
  shift,
  startOfWeek,
  visibleDates,
  weekdayIndex,
  type CalendarState,
} from "../../src/domain/calendar";
import type { Task } from "../../src/domain/task";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    tags: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

const state = (view: CalendarState["view"], anchor: string): CalendarState => ({ view, anchor });

describe("addDays", () => {
  it.each([
    ["2026-10-24", 1, "2026-10-25"],
    ["2026-10-31", 1, "2026-11-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2027-01-01", -1, "2026-12-31"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2024-02-28", 1, "2024-02-29"],
    ["2024-02-29", 1, "2024-03-01"],
    ["2023-02-28", 1, "2023-03-01"],
    ["2026-10-25", 0, "2026-10-25"],
    ["2026-10-25", 7, "2026-11-01"],
    ["2026-10-25", -30, "2026-09-25"],
  ])("%s plus %i days is %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });

  it("is not affected by daylight-saving changes", () => {
    // 2026-03-29 and 2026-10-25 are European clock-change days; 2026-03-08 and 2026-11-01 in the US.
    for (const date of ["2026-03-28", "2026-03-07", "2026-10-24", "2026-10-31"]) {
      expect(addDays(addDays(date, 1), -1)).toBe(date);
      expect(addDays(date, 2)).not.toBe(addDays(date, 1));
    }
  });
});

describe("addMonths", () => {
  it.each([
    ["2026-01-15", 1, "2026-02-15"],
    ["2026-01-31", 1, "2026-02-28"],
    ["2024-01-31", 1, "2024-02-29"],
    ["2026-12-15", 1, "2027-01-15"],
    ["2026-01-15", -1, "2025-12-15"],
    ["2026-03-31", -1, "2026-02-28"],
    ["2026-05-31", 1, "2026-06-30"],
    ["2026-10-25", 0, "2026-10-25"],
    ["2026-10-25", 12, "2027-10-25"],
  ])("%s plus %i months is %s", (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });
});

describe("weekdayIndex and startOfWeek (weeks start on Monday)", () => {
  it.each([
    ["2026-10-19", 0], // Monday
    ["2026-10-24", 5], // Saturday
    ["2026-10-25", 6], // Sunday
    ["2026-10-26", 0], // Monday
    ["2024-02-29", 3], // Thursday
  ])("%s has index %i", (date, index) => {
    expect(weekdayIndex(date)).toBe(index);
  });

  it.each([
    ["2026-10-25", "2026-10-19"],
    ["2026-10-19", "2026-10-19"],
    ["2026-10-21", "2026-10-19"],
    ["2026-11-01", "2026-10-26"],
    ["2027-01-01", "2026-12-28"],
  ])("the week of %s starts on %s", (date, start) => {
    expect(startOfWeek(date)).toBe(start);
  });
});

describe("daysInMonth", () => {
  it.each([
    [2024, 2, 29],
    [2026, 2, 28],
    [2000, 2, 29],
    [2100, 2, 28],
    [2026, 4, 30],
    [2026, 12, 31],
    [2026, 1, 31],
  ])("%i-%i has %i days", (year, month, days) => {
    expect(daysInMonth(year, month)).toBe(days);
  });
});

describe("monthGrid", () => {
  it("fills whole Monday-to-Sunday rows around the month (October 2026: 5 rows)", () => {
    const grid = monthGrid("2026-10-15");
    expect(grid).toHaveLength(5);
    expect(grid.every((row) => row.length === 7)).toBe(true);
    expect(grid[0]?.[0]).toBe("2026-09-28");
    expect(grid[4]?.[6]).toBe("2026-11-01");
  });

  it("can be exactly 4 rows (February 2027 starts on a Monday and ends on a Sunday)", () => {
    const grid = monthGrid("2027-02-10");
    expect(grid).toHaveLength(4);
    expect(grid[0]?.[0]).toBe("2027-02-01");
    expect(grid[3]?.[6]).toBe("2027-02-28");
  });

  it("can be 6 rows (August 2026)", () => {
    const grid = monthGrid("2026-08-15");
    expect(grid).toHaveLength(6);
    expect(grid[0]?.[0]).toBe("2026-07-27");
    expect(grid[5]?.[6]).toBe("2026-09-06");
  });

  it("is a run of consecutive days with the whole month inside it", () => {
    for (const anchor of ["2024-02-10", "2026-12-31", "2027-01-01", "2026-03-31"]) {
      const flat = monthGrid(anchor).flat();
      flat.forEach((date, i) => {
        if (i > 0) expect(date).toBe(addDays(flat[i - 1] ?? "", 1));
      });
      const inMonth = flat.filter((date) => isSameMonth(date, anchor));
      const [year, month] = anchor.split("-").map(Number);
      expect(inMonth).toHaveLength(daysInMonth(year ?? 0, month ?? 0));
    }
  });

  it("handles February in a leap year", () => {
    const flat = monthGrid("2024-02-10").flat();
    expect(flat).toContain("2024-02-29");
    expect(flat.filter((d) => isSameMonth(d, "2024-02-10"))).toHaveLength(29);
  });
});

describe("isSameMonth", () => {
  it("compares year and month", () => {
    expect(isSameMonth("2026-10-01", "2026-10-31")).toBe(true);
    expect(isSameMonth("2026-10-31", "2026-11-01")).toBe(false);
    expect(isSameMonth("2025-10-15", "2026-10-15")).toBe(false);
  });
});

describe("visibleDates", () => {
  it("returns the month grid dates for the month view", () => {
    expect(visibleDates(state("month", "2026-10-15"))).toEqual(monthGrid("2026-10-15").flat());
  });

  it("returns Monday to Sunday for the week view", () => {
    expect(visibleDates(state("week", "2026-10-25"))).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
  });

  it("returns just the anchor for the day view", () => {
    expect(visibleDates(state("day", "2026-10-25"))).toEqual(["2026-10-25"]);
  });
});

describe("shift", () => {
  it("moves a month, with the day clamped", () => {
    expect(shift(state("month", "2026-01-31"), 1)).toEqual(state("month", "2026-02-28"));
    expect(shift(state("month", "2026-03-31"), -1)).toEqual(state("month", "2026-02-28"));
    expect(shift(state("month", "2026-12-15"), 1)).toEqual(state("month", "2027-01-15"));
  });

  it("moves a week", () => {
    expect(shift(state("week", "2026-10-25"), 1)).toEqual(state("week", "2026-11-01"));
    expect(shift(state("week", "2026-10-25"), -1)).toEqual(state("week", "2026-10-18"));
  });

  it("moves a day", () => {
    expect(shift(state("day", "2026-12-31"), 1)).toEqual(state("day", "2027-01-01"));
    expect(shift(state("day", "2026-10-25"), -1)).toEqual(state("day", "2026-10-24"));
  });
});

describe("setView and goToDate", () => {
  it("keeps the anchor when the view changes, so the date stays in view", () => {
    const month = state("month", "2026-10-25");
    const week = setView(month, "week");
    expect(week).toEqual(state("week", "2026-10-25"));
    expect(visibleDates(week)).toContain("2026-10-25");
    const day = setView(week, "day");
    expect(visibleDates(day)).toEqual(["2026-10-25"]);
    expect(visibleDates(setView(day, "month"))).toContain("2026-10-25");
  });

  it("goToDate changes only the anchor", () => {
    expect(goToDate(state("week", "2026-10-25"), "2027-02-03")).toEqual(state("week", "2027-02-03"));
  });
});

describe("heading", () => {
  it("names the month", () => {
    expect(heading(state("month", "2026-10-25"))).toBe("October 2026");
    expect(heading(state("month", "2024-02-29"))).toBe("February 2024");
  });

  it("names the week, adding years only when the week crosses a year", () => {
    expect(heading(state("week", "2026-10-25"))).toBe("Oct 19 to Oct 25, 2026");
    expect(heading(state("week", "2026-09-30"))).toBe("Sep 28 to Oct 4, 2026");
    expect(heading(state("week", "2026-12-30"))).toBe("Dec 28, 2026 to Jan 3, 2027");
  });

  it("names the day with its weekday", () => {
    expect(heading(state("day", "2026-10-25"))).toBe("Sunday, October 25, 2026");
    expect(heading(state("day", "2024-02-29"))).toBe("Thursday, February 29, 2024");
  });
});

describe("entriesByDate", () => {
  it("leaves out tasks without a due date", () => {
    const map = entriesByDate([task("a"), task("b", { dueDate: "2026-10-25" })]);
    expect([...map.keys()]).toEqual(["2026-10-25"]);
  });

  it("groups tasks by their due date", () => {
    const map = entriesByDate([
      task("a", { dueDate: "2026-10-25" }),
      task("b", { dueDate: "2026-10-26" }),
      task("c", { dueDate: "2026-10-25" }),
    ]);
    expect(map.get("2026-10-25")?.map((t) => t.id).sort()).toEqual(["a", "c"]);
    expect(map.get("2026-10-26")?.map((t) => t.id)).toEqual(["b"]);
    expect(map.get("2026-10-27")).toBeUndefined();
  });

  it("orders a date's tasks: not completed first, then high to low priority, then title", () => {
    const due = "2026-10-25";
    const map = entriesByDate([
      task("done-high", { dueDate: due, status: "completed", priority: "high", title: "A" }),
      task("low", { dueDate: due, priority: "low", title: "Z" }),
      task("med-b", { dueDate: due, priority: "medium", title: "banana" }),
      task("med-a", { dueDate: due, priority: "medium", title: "Apple" }),
      task("high", { dueDate: due, priority: "high", title: "M" }),
    ]);
    expect(map.get(due)?.map((t) => t.id)).toEqual(["high", "med-a", "med-b", "low", "done-high"]);
  });

  it("does not change the input list", () => {
    const tasks = [task("b", { dueDate: "2026-10-25", title: "b" }), task("a", { dueDate: "2026-10-25", title: "a" })];
    entriesByDate(tasks);
    expect(tasks.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("rescheduleTask", () => {
  const original = task("a", { dueDate: "2026-10-25" });
  const now = new Date("2026-10-26T08:00:00.000Z");

  it("sets the new due date and the updated time", () => {
    const moved = rescheduleTask(original, "2026-11-02", now);
    expect(moved).toEqual({ ...original, dueDate: "2026-11-02", updatedAt: now.toISOString() });
    expect(original.dueDate).toBe("2026-10-25");
  });

  it("returns the same object when the date is the same", () => {
    expect(rescheduleTask(original, "2026-10-25", now)).toBe(original);
  });

  it("returns the same object when the date is not a real calendar date", () => {
    expect(rescheduleTask(original, "2026-02-30", now)).toBe(original);
    expect(rescheduleTask(original, "", now)).toBe(original);
    expect(rescheduleTask(original, "tomorrow", now)).toBe(original);
  });

  it("can schedule a task that has no due date", () => {
    expect(rescheduleTask(task("n"), "2026-10-30", now).dueDate).toBe("2026-10-30");
  });
});

describe("moveTarget", () => {
  it.each([
    ["ArrowLeft", "2026-10-24"],
    ["ArrowRight", "2026-10-26"],
    ["ArrowUp", "2026-10-18"],
    ["ArrowDown", "2026-11-01"],
  ])("%s from 2026-10-25 gives %s", (key, expected) => {
    expect(moveTarget("2026-10-25", key)).toBe(expected);
  });

  it("crosses month and year ends", () => {
    expect(moveTarget("2026-12-31", "ArrowRight")).toBe("2027-01-01");
    expect(moveTarget("2026-01-03", "ArrowUp")).toBe("2025-12-27");
  });

  it.each(["Enter", "Escape", "a", "Tab", " "])("ignores %j", (key) => {
    expect(moveTarget("2026-10-25", key)).toBeNull();
  });
});
