import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUERY,
  applyQuery,
  deriveTags,
  filterTasks,
  reconcileQuery,
  searchTasks,
  sortTasks,
  type Query,
} from "../../src/domain/query";
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

const q = (overrides: Partial<Query>): Query => ({ ...DEFAULT_QUERY, ...overrides });
const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe("filterTasks", () => {
  const tasks = [
    task("1", { status: "todo", priority: "low", tags: ["home"] }),
    task("2", { status: "in-progress", priority: "high", tags: ["Work", "urgent"] }),
    task("3", { status: "completed", priority: "high", tags: ["work"] }),
  ];

  it("returns everything for the default query", () => {
    expect(ids(filterTasks(tasks, DEFAULT_QUERY))).toEqual(["1", "2", "3"]);
  });

  it("filters by status", () => {
    expect(ids(filterTasks(tasks, q({ status: "in-progress" })))).toEqual(["2"]);
  });

  it("filters by priority", () => {
    expect(ids(filterTasks(tasks, q({ priority: "high" })))).toEqual(["2", "3"]);
  });

  it("filters by tag ignoring case", () => {
    expect(ids(filterTasks(tasks, q({ tag: "work" })))).toEqual(["2", "3"]);
    expect(ids(filterTasks(tasks, q({ tag: "WORK" })))).toEqual(["2", "3"]);
  });

  it("combines filters with AND", () => {
    expect(ids(filterTasks(tasks, q({ priority: "high", status: "completed", tag: "work" })))).toEqual(["3"]);
    expect(filterTasks(tasks, q({ priority: "low", tag: "work" }))).toEqual([]);
  });
});

describe("searchTasks", () => {
  const tasks = [
    task("1", { title: "Buy Milk", description: "from the shop" }),
    task("2", { title: "Plan trip", description: "Book MILK-run flights" }),
    task("3", { title: "Other", description: "" }),
  ];

  it("matches title or description, ignoring case", () => {
    expect(ids(searchTasks(tasks, "milk"))).toEqual(["1", "2"]);
    expect(ids(searchTasks(tasks, "SHOP"))).toEqual(["1"]);
  });

  it("returns everything for an empty or whitespace search", () => {
    expect(ids(searchTasks(tasks, ""))).toEqual(["1", "2", "3"]);
    expect(ids(searchTasks(tasks, "   "))).toEqual(["1", "2", "3"]);
  });

  it("returns nothing when no task matches", () => {
    expect(searchTasks(tasks, "zebra")).toEqual([]);
  });
});

describe("deriveTags", () => {
  it("collects unique tags ignoring case, sorted alphabetically, first spelling kept", () => {
    const tasks = [
      task("1", { tags: ["work", "Home"] }),
      task("2", { tags: ["Work", "alpha"] }),
    ];
    expect(deriveTags(tasks)).toEqual(["alpha", "Home", "work"]);
  });

  it("returns an empty list when no task has tags", () => {
    expect(deriveTags([task("1")])).toEqual([]);
  });
});

describe("sortTasks", () => {
  it("sorts by created, newest first (default)", () => {
    const tasks = [
      task("old", { createdAt: "2026-10-01T00:00:00.000Z" }),
      task("new", { createdAt: "2026-10-03T00:00:00.000Z" }),
      task("mid", { createdAt: "2026-10-02T00:00:00.000Z" }),
    ];
    expect(ids(sortTasks(tasks, "created"))).toEqual(["new", "mid", "old"]);
  });

  it("sorts by due date, earliest first, undated last", () => {
    const tasks = [
      task("none", { dueDate: null }),
      task("late", { dueDate: "2026-12-01" }),
      task("soon", { dueDate: "2026-11-01" }),
    ];
    expect(ids(sortTasks(tasks, "dueDate"))).toEqual(["soon", "late", "none"]);
  });

  it("sorts by priority high, medium, low with ties newest first", () => {
    const tasks = [
      task("low", { priority: "low" }),
      task("med-old", { priority: "medium", createdAt: "2026-10-01T00:00:00.000Z" }),
      task("high", { priority: "high" }),
      task("med-new", { priority: "medium", createdAt: "2026-10-05T00:00:00.000Z" }),
    ];
    expect(ids(sortTasks(tasks, "priority"))).toEqual(["high", "med-new", "med-old", "low"]);
  });

  it("does not mutate its input", () => {
    const tasks = [task("a", { createdAt: "2026-10-01T00:00:00.000Z" }), task("b", { createdAt: "2026-10-02T00:00:00.000Z" })];
    sortTasks(tasks, "created");
    expect(ids(tasks)).toEqual(["a", "b"]);
  });
});

describe("applyQuery", () => {
  it("filters, searches, and sorts together", () => {
    const tasks = [
      task("1", { title: "Alpha report", priority: "high", createdAt: "2026-10-01T00:00:00.000Z" }),
      task("2", { title: "Beta report", priority: "high", createdAt: "2026-10-02T00:00:00.000Z" }),
      task("3", { title: "Gamma report", priority: "low" }),
    ];
    const result = applyQuery(tasks, q({ priority: "high", search: "report" }));
    expect(ids(result)).toEqual(["2", "1"]);
  });
});

describe("reconcileQuery", () => {
  it("resets the tag filter to all when the selected tag no longer exists on any task", () => {
    const tasks = [task("1", { tags: ["home"] })];
    const result = reconcileQuery(q({ tag: "work", priority: "high" }), tasks);
    expect(result).toEqual(q({ tag: "all", priority: "high" }));
  });

  it("keeps the tag filter while some task still has the tag, ignoring case", () => {
    const tasks = [task("1", { tags: ["Work"] })];
    const query = q({ tag: "work" });
    expect(reconcileQuery(query, tasks)).toBe(query);
  });

  it("returns the same query object when the tag filter is already all", () => {
    expect(reconcileQuery(DEFAULT_QUERY, [])).toBe(DEFAULT_QUERY);
  });
});
