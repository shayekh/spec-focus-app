import { describe, expect, it } from "vitest";
import {
  isDirty,
  toFormValues,
  toTaskInput,
  validateForm,
  type FormValues,
} from "../../src/domain/taskDraft";
import type { Recurrence } from "../../src/domain/recurrence";
import type { Task } from "../../src/domain/task";

const task: Task = {
  id: "1",
  title: "Plan trip",
  description: "Flights and hotel",
  priority: "high",
  status: "in-progress",
  dueDate: "2026-12-01",
  tags: ["travel", "Personal"],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const base: FormValues = toFormValues(task);
const change = (overrides: Partial<FormValues>): FormValues => ({ ...base, ...overrides });

describe("toFormValues", () => {
  it("gives the defaults for a new task", () => {
    expect(toFormValues()).toEqual({
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      dueDate: "",
      tags: "",
      repeat: "none",
      repeatDays: [],
      repeatUntil: "",
    });
  });

  it("gives a task's saved values, joining tags and turning no due date into an empty string", () => {
    expect(toFormValues(task)).toEqual({
      title: "Plan trip",
      description: "Flights and hotel",
      priority: "high",
      status: "in-progress",
      dueDate: "2026-12-01",
      tags: "travel, Personal",
      repeat: "none",
      repeatDays: [],
      repeatUntil: "",
    });
    expect(toFormValues({ ...task, dueDate: null, tags: [] })).toMatchObject({
      dueDate: "",
      tags: "",
    });
  });
});

describe("toTaskInput", () => {
  it("splits and trims tags and drops empty ones", () => {
    expect(toTaskInput(change({ tags: " a ,, b ,  " })).tags).toEqual(["a", "b"]);
  });

  it("turns an empty due date into null and keeps a real one", () => {
    expect(toTaskInput(change({ dueDate: "" })).dueDate).toBeNull();
    expect(toTaskInput(change({ dueDate: "2027-01-02" })).dueDate).toBe("2027-01-02");
  });

  it("passes the other fields through", () => {
    expect(toTaskInput(base)).toMatchObject({
      title: "Plan trip",
      description: "Flights and hotel",
      priority: "high",
      status: "in-progress",
    });
  });
});

describe("isDirty", () => {
  it("is false for identical values", () => {
    expect(isDirty(base, { ...base })).toBe(false);
  });

  it("is false when title or description differ only by surrounding spaces", () => {
    expect(isDirty(base, change({ title: "  Plan trip  ", description: " Flights and hotel\n" }))).toBe(
      false,
    );
  });

  it("is false when tags differ only by spacing or by repeated tags that differ in case", () => {
    expect(isDirty(base, change({ tags: "  travel ,Personal,  " }))).toBe(false);
    expect(isDirty(base, change({ tags: "travel, Personal, PERSONAL" }))).toBe(false);
  });

  it("is false when a value is changed and then changed back", () => {
    const edited = change({ title: "Something else" });
    expect(isDirty(base, edited)).toBe(true);
    expect(isDirty(base, change({ title: edited.title }))).toBe(true);
    expect(isDirty(base, change({ title: "Plan trip" }))).toBe(false);
  });

  it.each<[string, Partial<FormValues>]>([
    ["title", { title: "Plan holiday" }],
    ["description", { description: "Flights only" }],
    ["priority", { priority: "low" }],
    ["status", { status: "completed" }],
    ["due date", { dueDate: "2026-12-02" }],
    ["due date cleared", { dueDate: "" }],
    ["tags added", { tags: "travel, Personal, extra" }],
    ["tags removed", { tags: "travel" }],
    ["tags reordered", { tags: "Personal, travel" }],
  ])("is true when the %s really differs", (_name, overrides) => {
    expect(isDirty(base, change(overrides))).toBe(true);
  });

  it("treats a brand new empty form as clean and any typing as dirty", () => {
    expect(isDirty(toFormValues(), toFormValues())).toBe(false);
    expect(isDirty(toFormValues(), { ...toFormValues(), title: "a" })).toBe(true);
    expect(isDirty(toFormValues(), { ...toFormValues(), title: "   " })).toBe(false);
  });
});

describe("validateForm", () => {
  it("returns no errors for valid values", () => {
    expect(validateForm(base)).toEqual({});
    expect(validateForm(change({ dueDate: "" }))).toEqual({});
  });

  it.each(["", "   ", "\t\n"])("requires a title (%j)", (title) => {
    expect(validateForm(change({ title }))).toEqual({ title: "Title is required." });
  });

  it("rejects a due date that is not a real calendar date", () => {
    expect(validateForm(change({ dueDate: "2026-02-30" }))).toEqual({
      dueDate: "Due date is not a valid date.",
    });
    expect(validateForm(change({ dueDate: "tomorrow" }))).toEqual({
      dueDate: "Due date is not a valid date.",
    });
  });

  it("reports every problem at once", () => {
    expect(validateForm(change({ title: "", dueDate: "nope" }))).toEqual({
      title: "Title is required.",
      dueDate: "Due date is not a valid date.",
    });
  });
});

const weeklyRule: Recurrence = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: "2027-03-01" };
const daysRule: Recurrence = { kind: "days", weekdays: [0, 2, 4], dayOfMonth: null, endDate: null };
const monthlyRule: Recurrence = { kind: "monthly", weekdays: [], dayOfMonth: 31, endDate: null };
const dailyRule: Recurrence = { kind: "daily", weekdays: [], dayOfMonth: null, endDate: null };

function recurring(rule: Recurrence): Task {
  return { ...task, dueDate: "2026-10-15", recurrence: rule, seriesId: "s1" };
}

describe("repeat fields in toFormValues", () => {
  it.each([
    [dailyRule, { repeat: "daily", repeatDays: [], repeatUntil: "" }],
    [weeklyRule, { repeat: "weekly", repeatDays: [], repeatUntil: "2027-03-01" }],
    [monthlyRule, { repeat: "monthly", repeatDays: [], repeatUntil: "" }],
    [daysRule, { repeat: "days", repeatDays: [0, 2, 4], repeatUntil: "" }],
  ])("reads the rule %j", (rule, expected) => {
    expect(toFormValues(recurring(rule))).toMatchObject(expected);
  });

  it("does not share the days array with the task", () => {
    const original = recurring(daysRule);
    const values = toFormValues(original);
    values.repeatDays.push(6);
    expect(original.recurrence?.weekdays).toEqual([0, 2, 4]);
  });
});

describe("repeat fields in toTaskInput", () => {
  const values = (overrides: Partial<FormValues>): FormValues => ({
    ...toFormValues(),
    title: "Water plants",
    dueDate: "2026-10-15",
    ...overrides,
  });

  it("gives no rule when the task does not repeat", () => {
    expect(toTaskInput(values({})).recurrence).toBeNull();
  });

  it("builds a weekly rule from the due date's weekday", () => {
    expect(toTaskInput(values({ repeat: "weekly" })).recurrence).toEqual({
      kind: "weekly",
      weekdays: [3],
      dayOfMonth: null,
      endDate: null,
    });
  });

  it("builds a monthly rule from the due date's day of the month, and a daily rule with no anchor", () => {
    expect(toTaskInput(values({ repeat: "monthly", dueDate: "2026-01-31" })).recurrence).toEqual(monthlyRule);
    expect(toTaskInput(values({ repeat: "daily" })).recurrence).toEqual(dailyRule);
  });

  it("builds a selected-days rule with the chosen days sorted", () => {
    expect(toTaskInput(values({ repeat: "days", repeatDays: [4, 0, 2] })).recurrence).toEqual(daysRule);
  });

  it("passes the end date through, or none when it is empty", () => {
    expect(toTaskInput(values({ repeat: "daily", repeatUntil: "2026-12-31" })).recurrence?.endDate).toBe("2026-12-31");
    expect(toTaskInput(values({ repeat: "daily", repeatUntil: "" })).recurrence?.endDate).toBeNull();
  });

  it("keeps the stored anchor when the rule's kind is unchanged, even if the due date moved", () => {
    const moved = values({ repeat: "weekly", dueDate: "2026-10-20", repeatUntil: "2027-03-01" });
    expect(toTaskInput(moved, weeklyRule).recurrence).toEqual(weeklyRule);
  });

  it("re-derives the anchor when the kind changes", () => {
    expect(toTaskInput(values({ repeat: "weekly", dueDate: "2026-10-20" }), monthlyRule).recurrence?.weekdays).toEqual([1]);
  });
});

describe("repeat fields in isDirty", () => {
  const initial = toFormValues(recurring(daysRule));

  it("is false when nothing changed", () => {
    expect(isDirty(initial, { ...initial, repeatDays: [...initial.repeatDays] })).toBe(false);
  });

  it("is true when the repeat kind, the days, or the end date change", () => {
    expect(isDirty(initial, { ...initial, repeat: "daily" })).toBe(true);
    expect(isDirty(initial, { ...initial, repeatDays: [0, 2] })).toBe(true);
    expect(isDirty(initial, { ...initial, repeatUntil: "2027-01-01" })).toBe(true);
  });

  it("ignores the order the days were ticked in", () => {
    expect(isDirty(initial, { ...initial, repeatDays: [4, 2, 0] })).toBe(false);
  });

  it("ignores days that do not matter for the chosen kind, and an end date when nothing repeats", () => {
    const weekly = toFormValues(recurring(weeklyRule));
    expect(isDirty(weekly, { ...weekly, repeatDays: [1, 2] })).toBe(false);
    const none = toFormValues(task);
    expect(isDirty(none, { ...none, repeatUntil: "2027-01-01", repeatDays: [3] })).toBe(false);
  });

  it("treats choosing a repeat on an ordinary task as a change", () => {
    const none = toFormValues(task);
    expect(isDirty(none, { ...none, repeat: "daily" })).toBe(true);
  });
});

describe("repeat fields in validateForm", () => {
  const ok = (overrides: Partial<FormValues>): FormValues => ({ ...base, repeat: "weekly", ...overrides });

  it("has no repeat errors when the task does not repeat, whatever the other repeat fields hold", () => {
    expect(validateForm({ ...base, repeat: "none", repeatDays: [], repeatUntil: "nonsense" })).toEqual({});
  });

  it("accepts a valid repeat", () => {
    expect(validateForm(ok({ repeatUntil: "2027-01-01" }))).toEqual({});
    expect(validateForm(ok({ repeat: "days", repeatDays: [1] }))).toEqual({});
  });

  it("asks for a due date when a repeat is chosen without one", () => {
    expect(validateForm(ok({ dueDate: "" }))).toEqual({ dueDate: "Choose a due date to start the repeat from." });
  });

  it("keeps the invalid-date message when the due date is not a real date", () => {
    expect(validateForm(ok({ dueDate: "2026-02-30" })).dueDate).toBe("Due date is not a valid date.");
  });

  it("asks for at least one day for selected days", () => {
    expect(validateForm(ok({ repeat: "days", repeatDays: [] }))).toEqual({ repeatDays: "Choose at least one day." });
  });

  it("rejects an end date before the due date, and one that is not a real date", () => {
    expect(validateForm(ok({ repeatUntil: "2026-11-30" }))).toEqual({
      repeatUntil: "End date cannot be earlier than the due date.",
    });
    expect(validateForm(ok({ repeatUntil: "2027-02-30" }))).toEqual({ repeatUntil: "End date is not a valid date." });
  });

  it("allows an end date equal to the due date", () => {
    expect(validateForm(ok({ repeatUntil: "2026-12-01" }))).toEqual({});
  });

  it("reports every problem at once", () => {
    expect(validateForm(ok({ title: "", dueDate: "", repeat: "days", repeatDays: [], repeatUntil: "nope" }))).toEqual({
      title: "Title is required.",
      dueDate: "Choose a due date to start the repeat from.",
      repeatDays: "Choose at least one day.",
      repeatUntil: "End date is not a valid date.",
    });
  });
});
