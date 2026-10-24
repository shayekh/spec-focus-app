import { describe, expect, it } from "vitest";
import { loadTasks, saveTasks, TASKS_KEY } from "../../src/storage/taskStore";
import type { Task } from "../../src/domain/task";

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
