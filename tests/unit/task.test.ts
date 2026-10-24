import { describe, expect, it } from "vitest";
import { completeTask, createTask, normalizeTags, updateTask } from "../../src/domain/task";

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
