import { describe, expect, it } from "vitest";
import {
  completeTask,
  createTask,
  dropUnreadableRecurrence,
  isPriority,
  isRecord,
  isStatus,
  isTask,
  normalizeTags,
  repairStoredTask,
  updateTask,
  type Task,
} from "../../src/domain/task";
import type { Recurrence } from "../../src/domain/recurrence";

describe("type guards", () => {
  it("isRecord accepts plain objects only", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    for (const value of [null, undefined, [], [1], "text", 5, true]) {
      expect(isRecord(value)).toBe(false);
    }
  });

  it("isPriority and isStatus accept only the allowed values", () => {
    for (const value of ["low", "medium", "high"]) expect(isPriority(value)).toBe(true);
    for (const value of ["urgent", "", null, 3]) expect(isPriority(value)).toBe(false);
    for (const value of ["todo", "in-progress", "completed"]) expect(isStatus(value)).toBe(true);
    for (const value of ["done", "", undefined, {}]) expect(isStatus(value)).toBe(false);
  });
});

const NOW = new Date("2026-10-25T10:00:00.000Z");

describe("createTask", () => {
  it("applies defaults for a title-only task", () => {
    const result = createTask({ title: "Buy milk" }, NOW, "id-1");
    expect(result).toEqual({
      ok: true,
      task: {
        id: "id-1",
        title: "Buy milk",
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: null,
        tags: [],
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    });
  });

  it("keeps all provided fields", () => {
    const result = createTask(
      {
        title: "Plan trip",
        description: "Flights and hotel",
        priority: "high",
        status: "in-progress",
        dueDate: "2026-12-01",
        tags: ["travel", "personal"],
      },
      NOW,
      "id-2",
    );
    expect(result.ok && result.task).toMatchObject({
      title: "Plan trip",
      description: "Flights and hotel",
      priority: "high",
      status: "in-progress",
      dueDate: "2026-12-01",
      tags: ["travel", "personal"],
    });
  });

  it("trims the title", () => {
    const result = createTask({ title: "  Spaced out  " }, NOW);
    expect(result.ok && result.task.title).toBe("Spaced out");
  });

  it.each(["", "   ", "\t\n"])("rejects an empty or whitespace-only title (%j)", (title) => {
    const result = createTask({ title }, NOW);
    expect(result).toEqual({ ok: false, error: "Title is required." });
  });

  it("treats an empty due date as no due date", () => {
    const result = createTask({ title: "x", dueDate: "" }, NOW);
    expect(result.ok && result.task.dueDate).toBeNull();
  });

  it("rejects a due date that is not a real calendar date", () => {
    const result = createTask({ title: "x", dueDate: "2026-02-30" }, NOW);
    expect(result.ok).toBe(false);
  });

  it("generates a unique id when none is given", () => {
    const a = createTask({ title: "a" }, NOW);
    const b = createTask({ title: "b" }, NOW);
    expect(a.ok && b.ok && a.task.id !== b.task.id).toBe(true);
  });
});

describe("normalizeTags", () => {
  it("trims tags and drops empty ones", () => {
    expect(normalizeTags(["  work ", "", "   ", "home"])).toEqual(["work", "home"]);
  });

  it("de-duplicates ignoring case and keeps the first spelling", () => {
    expect(normalizeTags(["Work", "work", "WORK", "Home"])).toEqual(["Work", "Home"]);
  });
});

describe("updateTask", () => {
  const LATER = new Date("2026-10-26T09:00:00.000Z");
  const created = createTask({ title: "Original", tags: ["a"] }, NOW, "id-9");
  if (!created.ok) throw new Error("fixture");
  const original = created.task;

  it("changes fields, keeps id and createdAt, and refreshes updatedAt", () => {
    const result = updateTask(
      original,
      {
        title: "Renamed",
        description: "More",
        priority: "low",
        status: "in-progress",
        dueDate: "2026-11-02",
        tags: ["b", "B"],
      },
      LATER,
    );
    expect(result).toEqual({
      ok: true,
      task: {
        id: "id-9",
        title: "Renamed",
        description: "More",
        priority: "low",
        status: "in-progress",
        dueDate: "2026-11-02",
        tags: ["b"],
        createdAt: NOW.toISOString(),
        updatedAt: LATER.toISOString(),
      },
    });
  });

  it("can clear the due date", () => {
    const withDate = updateTask(original, { title: "x", dueDate: "2026-11-02" }, LATER);
    if (!withDate.ok) throw new Error("fixture");
    const cleared = updateTask(withDate.task, { title: "x", dueDate: null }, LATER);
    expect(cleared.ok && cleared.task.dueDate).toBeNull();
  });

  it("rejects an empty title and leaves the original untouched", () => {
    expect(updateTask(original, { title: "  " }, LATER)).toEqual({
      ok: false,
      error: "Title is required.",
    });
    expect(original.title).toBe("Original");
  });
});

describe("completeTask", () => {
  const created = createTask({ title: "Do it" }, NOW, "id-10");
  if (!created.ok) throw new Error("fixture");

  it("sets the status to completed and refreshes updatedAt", () => {
    const later = new Date("2026-10-27T00:00:00.000Z");
    const done = completeTask(created.task, later);
    expect(done.status).toBe("completed");
    expect(done.updatedAt).toBe(later.toISOString());
    expect(done.title).toBe("Do it");
  });

  it("allows moving away from completed again via updateTask", () => {
    const done = completeTask(created.task, NOW);
    const reopened = updateTask(done, { title: done.title, status: "todo" }, NOW);
    expect(reopened.ok && reopened.task.status).toBe("todo");
  });
});

const weekly: Recurrence = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: null };
const NEEDS_DUE_DATE = "Choose a due date to start the repeat from.";

function stored(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "t1",
    title: "Water plants",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: "2026-10-15",
    tags: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isTask with recurrence", () => {
  it("accepts tasks with no recurrence fields", () => {
    expect(isTask(stored())).toBe(true);
  });

  it("accepts a valid rule with a series id and a due date", () => {
    expect(isTask(stored({ recurrence: weekly, seriesId: "s1" }))).toBe(true);
  });

  it.each([
    ["an invalid rule", { recurrence: { ...weekly, kind: "yearly" }, seriesId: "s1" }],
    ["a rule that is null", { recurrence: null, seriesId: "s1" }],
    ["a series id without a rule", { seriesId: "s1" }],
    ["a rule without a series id", { recurrence: weekly }],
    ["an empty series id", { recurrence: weekly, seriesId: "" }],
    ["a series id that is not text", { recurrence: weekly, seriesId: 7 }],
    ["a rule on a task with no due date", { recurrence: weekly, seriesId: "s1", dueDate: null }],
  ])("rejects %s", (_name, overrides) => {
    expect(isTask(stored(overrides))).toBe(false);
  });
});

describe("isTask with a series template", () => {
  const template = { title: "Water plants", description: "", priority: "medium", tags: ["home"] };

  it("accepts a template on a recurring task", () => {
    expect(isTask(stored({ recurrence: weekly, seriesId: "s1", seriesTemplate: template }))).toBe(true);
  });

  it.each([
    ["a template without a rule", { seriesTemplate: template }],
    ["a template with an empty title", { recurrence: weekly, seriesId: "s1", seriesTemplate: { ...template, title: " " } }],
    ["a template with a bad priority", { recurrence: weekly, seriesId: "s1", seriesTemplate: { ...template, priority: "urgent" } }],
    ["a template with bad tags", { recurrence: weekly, seriesId: "s1", seriesTemplate: { ...template, tags: [3] } }],
    ["a template that is not an object", { recurrence: weekly, seriesId: "s1", seriesTemplate: "x" }],
  ])("rejects %s", (_name, overrides) => {
    expect(isTask(stored(overrides))).toBe(false);
  });

  it("is repaired away together with the rule when unreadable", () => {
    const repaired = dropUnreadableRecurrence(stored({ recurrence: weekly, seriesId: "s1", seriesTemplate: { title: 5 } }));
    expect(isRecord(repaired) && "seriesTemplate" in repaired).toBe(false);
    expect(isRecord(repaired) && "recurrence" in repaired).toBe(false);
  });

  it("is kept by updateTask while the rule stays, and dropped with it", () => {
    const made = createTask({ title: "Water plants", dueDate: "2026-10-15", recurrence: weekly }, NOW, "id-1", "s1");
    if (!made.ok) throw new Error("fixture");
    const withTemplate = {
      ...made.task,
      seriesTemplate: { title: "Water plants", description: "", priority: "medium" as const, tags: [] },
    };
    const kept = updateTask(withTemplate, { title: "Renamed this one" }, NOW);
    expect(kept.ok && kept.task.seriesTemplate).toEqual(withTemplate.seriesTemplate);
    const dropped = updateTask(withTemplate, { title: "x", recurrence: null }, NOW);
    expect(dropped.ok && "seriesTemplate" in dropped.task).toBe(false);
  });
});

describe("dropUnreadableRecurrence", () => {
  it("leaves tasks without recurrence exactly as they are", () => {
    const plain = stored();
    expect(dropUnreadableRecurrence(plain)).toBe(plain);
  });

  it("leaves valid recurring tasks exactly as they are", () => {
    const recurring = stored({ recurrence: weekly, seriesId: "s1" });
    expect(dropUnreadableRecurrence(recurring)).toBe(recurring);
  });

  it.each([
    ["an invalid rule", { recurrence: { kind: "yearly" }, seriesId: "s1" }],
    ["a series id with no rule", { seriesId: "s1" }],
    ["a rule with no series id", { recurrence: weekly }],
    ["a rule with no due date", { recurrence: weekly, seriesId: "s1", dueDate: null }],
    ["a rule that is not an object", { recurrence: "weekly", seriesId: "s1" }],
  ])("removes both fields from a task with %s and keeps the rest", (_name, overrides) => {
    const repaired = dropUnreadableRecurrence(stored(overrides));
    expect(repaired).toEqual(stored({ dueDate: "dueDate" in overrides ? null : "2026-10-15" }));
    expect(isRecord(repaired) && "recurrence" in repaired).toBe(false);
    expect(isRecord(repaired) && "seriesId" in repaired).toBe(false);
  });

  it("does not change its input", () => {
    const bad = stored({ recurrence: { kind: "yearly" }, seriesId: "s1" });
    dropUnreadableRecurrence(bad);
    expect(bad).toHaveProperty("recurrence");
  });

  it("passes through values that are not objects", () => {
    expect(dropUnreadableRecurrence("text")).toBe("text");
    expect(dropUnreadableRecurrence(null)).toBeNull();
    expect(dropUnreadableRecurrence(5)).toBe(5);
  });
});

describe("createTask and updateTask with a repeat rule", () => {
  const input = { title: "Water plants", dueDate: "2026-10-15" };

  it("creates a task in a new series when given a rule", () => {
    const result = createTask({ ...input, recurrence: weekly }, NOW, "id-1", "series-1");
    expect(result.ok && result.task.recurrence).toEqual(weekly);
    expect(result.ok && result.task.seriesId).toBe("series-1");
  });

  it("gives a task without a rule neither field", () => {
    const result = createTask(input, NOW, "id-1", "series-1");
    expect(result.ok && "recurrence" in result.task).toBe(false);
    expect(result.ok && "seriesId" in result.task).toBe(false);
  });

  it("refuses a rule on a task with no due date", () => {
    expect(createTask({ title: "x", recurrence: weekly }, NOW)).toEqual({ ok: false, error: NEEDS_DUE_DATE });
    expect(createTask({ title: "x", dueDate: "", recurrence: weekly }, NOW)).toEqual({
      ok: false,
      error: NEEDS_DUE_DATE,
    });
  });

  it("keeps the rule and series when an update does not mention them", () => {
    const made = createTask({ ...input, recurrence: weekly }, NOW, "id-1", "series-1");
    if (!made.ok) throw new Error("fixture");
    const updated = updateTask(made.task, { title: "Renamed" }, NOW);
    expect(updated.ok && updated.task.recurrence).toEqual(weekly);
    expect(updated.ok && updated.task.seriesId).toBe("series-1");
  });

  it("clears both fields when an update sets the rule to null", () => {
    const made = createTask({ ...input, recurrence: weekly }, NOW, "id-1", "series-1");
    if (!made.ok) throw new Error("fixture");
    const updated = updateTask(made.task, { title: "x", recurrence: null }, NOW);
    expect(updated.ok && "recurrence" in updated.task).toBe(false);
    expect(updated.ok && "seriesId" in updated.task).toBe(false);
  });

  it("starts a new series when a plain task is given a rule", () => {
    const made = createTask(input, NOW, "id-1");
    if (!made.ok) throw new Error("fixture");
    const updated = updateTask(made.task, { title: "x", recurrence: weekly }, NOW, "series-9");
    expect(updated.ok && updated.task.recurrence).toEqual(weekly);
    expect(updated.ok && updated.task.seriesId).toBe("series-9");
  });

  it("keeps an existing series id when the rule changes", () => {
    const made = createTask({ ...input, recurrence: weekly }, NOW, "id-1", "series-1");
    if (!made.ok) throw new Error("fixture");
    const daily: Recurrence = { kind: "daily", weekdays: [], dayOfMonth: null, endDate: null };
    const updated = updateTask(made.task, { title: "x", recurrence: daily }, NOW, "series-other");
    expect(updated.ok && updated.task.seriesId).toBe("series-1");
    expect(updated.ok && updated.task.recurrence).toEqual(daily);
  });

  it("refuses to remove the due date of a recurring task", () => {
    const made = createTask({ ...input, recurrence: weekly }, NOW, "id-1", "series-1");
    if (!made.ok) throw new Error("fixture");
    expect(updateTask(made.task, { title: "x", dueDate: null }, NOW)).toEqual({
      ok: false,
      error: NEEDS_DUE_DATE,
    });
  });

  it("allows removing the due date together with the rule", () => {
    const made = createTask({ ...input, recurrence: weekly }, NOW, "id-1", "series-1");
    if (!made.ok) throw new Error("fixture");
    const updated = updateTask(made.task, { title: "x", dueDate: null, recurrence: null }, NOW);
    expect(updated.ok && updated.task.dueDate).toBeNull();
  });
});

describe("subtasks on a task", () => {
  const steps = [
    { id: "a", title: "One", priority: "medium", dueDate: null, done: false },
    { id: "b", title: "Two", priority: "high", dueDate: "2026-10-20", done: true },
  ];

  it("isTask accepts valid subtasks and rejects an unreadable list", () => {
    expect(isTask(stored({ subtasks: steps }))).toBe(true);
    expect(isTask(stored())).toBe(true);
    expect(isTask(stored({ subtasks: [{ id: "a" }] }))).toBe(false);
    expect(isTask(stored({ subtasks: [] }))).toBe(false);
    expect(isTask(stored({ subtasks: "nope" }))).toBe(false);
  });

  it("completeTask marks every subtask done and leaves a task without subtasks alone", () => {
    const withSteps = { ...(stored() as unknown as Task), subtasks: steps as Task["subtasks"] };
    const done = completeTask(withSteps, NOW);
    expect(done.status).toBe("completed");
    expect(done.subtasks?.map((s) => s.done)).toEqual([true, true]);
    expect(done.subtasks?.map((s) => s.id)).toEqual(["a", "b"]);
    expect(withSteps.subtasks?.[0]?.done).toBe(false);

    const plain = completeTask(stored() as unknown as Task, NOW);
    expect(plain).not.toHaveProperty("subtasks");
  });

  it("updateTask keeps subtasks, and completes them when the status changes to completed", () => {
    const open = { ...(stored() as unknown as Task), subtasks: steps as Task["subtasks"] };

    const renamed = updateTask(open, { title: "Renamed" }, NOW);
    expect(renamed.ok && renamed.task.subtasks).toEqual(steps);

    const completed = updateTask(open, { title: open.title, status: "completed" }, NOW);
    expect(completed.ok && completed.task.subtasks?.map((s) => s.done)).toEqual([true, true]);

    const progressed = updateTask(open, { title: open.title, status: "in-progress" }, NOW);
    expect(progressed.ok && progressed.task.subtasks?.map((s) => s.done)).toEqual([false, true]);
  });

  it("updateTask leaves the subtasks of an already completed task as they are, and reopening changes nothing", () => {
    const done = { ...(stored({ status: "completed" }) as unknown as Task), subtasks: steps as Task["subtasks"] };
    const edited = updateTask(done, { title: "Edited" }, NOW);
    expect(edited.ok && edited.task.subtasks?.map((s) => s.done)).toEqual([false, true]);

    const reopened = updateTask(done, { title: done.title, status: "todo" }, NOW);
    expect(reopened.ok && reopened.task.subtasks).toEqual(steps);
  });

  it("createTask never invents subtasks", () => {
    const created = createTask({ title: "New" }, NOW, "n");
    expect(created.ok && created.task).not.toHaveProperty("subtasks");
  });

  it("repairStoredTask removes unreadable recurrence and unreadable subtasks together and changes nothing else", () => {
    const bad = stored({ recurrence: { kind: "yearly" }, seriesId: "s1", subtasks: [{ id: "x" }] });
    const repaired = repairStoredTask(bad);
    expect(repaired).toEqual(stored());
    expect(repaired).not.toHaveProperty("subtasks");
    expect(repaired).not.toHaveProperty("recurrence");

    const fine = stored({ subtasks: steps });
    expect(repairStoredTask(fine)).toBe(fine);
    expect(repairStoredTask("text")).toBe("text");
  });
});
