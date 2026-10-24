import { describe, expect, it } from "vitest";
import { loadTasks, saveTasks, TASKS_KEY } from "../../src/storage/taskStore";
import type { Recurrence } from "../../src/domain/recurrence";
import type { SeriesTemplate, Task } from "../../src/domain/task";

const sample: Task = {
  id: "a1",
  title: "Write report",
  description: "Quarterly",
  priority: "high",
  status: "in-progress",
  dueDate: "2026-11-01",
  tags: ["work", "writing"],
  createdAt: "2026-10-25T10:00:00.000Z",
  updatedAt: "2026-10-25T10:00:00.000Z",
};

describe("taskStore", () => {
  it("round-trips saved tasks", () => {
    expect(saveTasks([sample]).ok).toBe(true);
    expect(loadTasks()).toEqual({ tasks: [sample], notice: null });
  });

  it("returns an empty list with no notice when nothing is stored", () => {
    expect(loadTasks()).toEqual({ tasks: [], notice: null });
  });

  it("returns an empty list and a notice for invalid JSON", () => {
    localStorage.setItem(TASKS_KEY, "{not json");
    const result = loadTasks();
    expect(result.tasks).toEqual([]);
    expect(result.notice).toMatch(/could not be read/i);
  });

  it("returns an empty list and a notice for the wrong version", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 99, tasks: [] }));
    const result = loadTasks();
    expect(result.tasks).toEqual([]);
    expect(result.notice).not.toBeNull();
  });

  it("returns an empty list and a notice when tasks is not an array", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks: "nope" }));
    expect(loadTasks().notice).not.toBeNull();
  });

  it("returns an empty list and a notice when a task is malformed", () => {
    localStorage.setItem(
      TASKS_KEY,
      JSON.stringify({ version: 1, tasks: [{ ...sample, priority: "urgent" }] }),
    );
    const result = loadTasks();
    expect(result.tasks).toEqual([]);
    expect(result.notice).not.toBeNull();
  });

  it("reports a failed save instead of throwing", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    try {
      expect(saveTasks([sample]).ok).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

const rule: Recurrence = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: "2026-12-31" };
const template: SeriesTemplate = { title: "Water plants", description: "", priority: "medium", tags: [] };

function stored(doc: unknown): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(doc));
}

describe("taskStore with recurring tasks", () => {
  const recurring: Task = {
    ...sample,
    id: "r1",
    title: "Water plants",
    dueDate: "2026-10-15",
    recurrence: rule,
    seriesId: "s1",
    seriesTemplate: template,
  };

  it("round-trips recurring tasks exactly", () => {
    expect(saveTasks([recurring, sample]).ok).toBe(true);
    expect(loadTasks()).toEqual({ tasks: [recurring, sample], notice: null });
  });

  it("loads documents that have none of the recurrence fields, unchanged", () => {
    stored({ version: 1, tasks: [sample] });
    expect(loadTasks()).toEqual({ tasks: [sample], notice: null });
  });

  it("loads a task with an unreadable rule as an ordinary task, and the rest normally, without a notice", () => {
    stored({
      version: 1,
      tasks: [
        { ...sample, id: "bad", recurrence: { kind: "yearly" }, seriesId: "s9", seriesTemplate: template },
        recurring,
        sample,
      ],
    });
    const { tasks, notice } = loadTasks();
    expect(notice).toBeNull();
    expect(tasks).toHaveLength(3);
    const bad = tasks.find((t) => t.id === "bad");
    expect(bad).toEqual({ ...sample, id: "bad" });
    expect(bad).not.toHaveProperty("recurrence");
    expect(bad).not.toHaveProperty("seriesId");
    expect(bad).not.toHaveProperty("seriesTemplate");
    expect(tasks.find((t) => t.id === "r1")).toEqual(recurring);
  });

  it.each([
    ["a series id without a rule", { seriesId: "s1" }],
    ["a rule without a series id", { recurrence: rule }],
    ["a rule on a task with no due date", { recurrence: rule, seriesId: "s1", dueDate: null }],
  ])("repairs %s", (_name, overrides) => {
    stored({ version: 1, tasks: [{ ...sample, ...overrides }] });
    const { tasks, notice } = loadTasks();
    expect(notice).toBeNull();
    expect(tasks[0]).not.toHaveProperty("recurrence");
    expect(tasks[0]).not.toHaveProperty("seriesId");
  });

  it("still rejects a document with a task that is invalid in some other way", () => {
    stored({ version: 1, tasks: [{ ...sample, recurrence: rule, seriesId: "s1", priority: "urgent" }] });
    const result = loadTasks();
    expect(result.tasks).toEqual([]);
    expect(result.notice).not.toBeNull();
  });
});

describe("taskStore subtasks", () => {
  const steps = [
    { id: "s2", title: "Second", priority: "high", dueDate: "2026-11-02", done: true },
    { id: "s1", title: "First", priority: "medium", dueDate: null, done: false },
  ];
  const withSteps = { ...sample, id: "p1", subtasks: steps } as Task;

  it("round-trips subtasks in order", () => {
    expect(saveTasks([withSteps, sample]).ok).toBe(true);
    const loaded = loadTasks();
    expect(loaded.notice).toBeNull();
    expect(loaded.tasks[0]?.subtasks?.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(loaded.tasks).toEqual([withSteps, sample]);
  });

  it("loads documents without subtasks unchanged", () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks: [sample] }));
    expect(loadTasks()).toEqual({ tasks: [sample], notice: null });
  });

  it("loads a task with unreadable subtasks as the same task without them, and the rest normally", () => {
    localStorage.setItem(
      TASKS_KEY,
      JSON.stringify({
        version: 1,
        tasks: [{ ...sample, id: "bad", subtasks: [{ id: "x", title: "" }] }, withSteps, sample],
      }),
    );
    const { tasks, notice } = loadTasks();
    expect(notice).toBeNull();
    expect(tasks).toHaveLength(3);
    expect(tasks.find((t) => t.id === "bad")).toEqual({ ...sample, id: "bad" });
    expect(tasks.find((t) => t.id === "bad")).not.toHaveProperty("subtasks");
    expect(tasks.find((t) => t.id === "p1")).toEqual(withSteps);
  });
});
