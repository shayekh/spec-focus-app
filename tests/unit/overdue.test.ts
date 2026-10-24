import { describe, expect, it } from "vitest";
import { isOverdue, todayString } from "../../src/domain/overdue";
import type { Task } from "../../src/domain/task";

function task(overrides: Partial<Task>): Task {
  return {
    id: "1",
    title: "t",
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

describe("isOverdue", () => {
  const today = "2026-10-25";

  it("is true when the due date is before today and the task is not completed", () => {
    expect(isOverdue(task({ dueDate: "2026-10-24" }), today)).toBe(true);
    expect(isOverdue(task({ dueDate: "2026-10-24", status: "in-progress" }), today)).toBe(true);
  });

  it("is false for a completed task", () => {
    expect(isOverdue(task({ dueDate: "2026-10-24", status: "completed" }), today)).toBe(false);
  });

  it("is false when there is no due date", () => {
    expect(isOverdue(task({ dueDate: null }), today)).toBe(false);
  });

  it("is false when due today or later", () => {
    expect(isOverdue(task({ dueDate: "2026-10-25" }), today)).toBe(false);
    expect(isOverdue(task({ dueDate: "2026-10-26" }), today)).toBe(false);
  });
});

describe("todayString", () => {
  it("formats the local date as YYYY-MM-DD", () => {
    expect(todayString(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
