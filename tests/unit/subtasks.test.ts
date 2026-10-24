import { describe, expect, it } from "vitest";
import {
  MAX_SUBTASKS,
  addSubtask,
  completeSubtasks,
  copySubtasks,
  deleteSubtask,
  describeProgress,
  dropUnreadableSubtasks,
  editSubtask,
  isSubtaskList,
  isSubtaskOverdue,
  moveSubtask,
  progress,
  setSubtaskDone,
  type Subtask,
} from "../../src/domain/subtasks";
import type { Task } from "../../src/domain/task";

const NOW = new Date("2026-10-15T10:00:00.000Z");
const LATER = new Date("2026-10-16T10:00:00.000Z");

function sub(id: string, overrides: Partial<Subtask> = {}): Subtask {
  return { id, title: `Step ${id}`, priority: "medium", dueDate: null, done: false, ...overrides };
}

function task(subtasks?: Subtask[], overrides: Partial<Task> = {}): Task {
  const base: Task = {
    id: "t1",
    title: "Parent",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    tags: ["work"],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
  return subtasks ? { ...base, subtasks } : base;
}

function many(count: number): Subtask[] {
  return Array.from({ length: count }, (_, i) => sub(`s${i}`));
}

describe("addSubtask", () => {
  it("appends a subtask with the defaults: medium, no date, not done", () => {
    const result = addSubtask(task([sub("a")]), { title: "Write" }, "b", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtask).toEqual({ id: "b", title: "Write", priority: "medium", dueDate: null, done: false });
    expect(result.task.subtasks?.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("adds the first subtask to a task that has none", () => {
    const result = addSubtask(task(), { title: "First" }, "a", NOW);
    expect(result.ok && result.task.subtasks).toHaveLength(1);
  });

  it("trims the title and accepts a priority and a due date", () => {
    const result = addSubtask(task(), { title: "  Write  ", priority: "high", dueDate: "2026-10-20" }, "a", NOW);
    expect(result.ok && result.subtask).toMatchObject({ title: "Write", priority: "high", dueDate: "2026-10-20" });
  });

  it("treats an empty due date as no date", () => {
    const result = addSubtask(task(), { title: "x", dueDate: "" }, "a", NOW);
    expect(result.ok && result.subtask.dueDate).toBeNull();
  });

  it("sets updatedAt and leaves the input task unchanged", () => {
    const original = task([sub("a")]);
    const result = addSubtask(original, { title: "x" }, "b", NOW);
    expect(result.ok && result.task.updatedAt).toBe(NOW.toISOString());
    expect(original.subtasks).toHaveLength(1);
    expect(original.updatedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("refuses a blank title", () => {
    expect(addSubtask(task(), { title: "   " }, "a", NOW)).toEqual({ ok: false, error: "Title is required." });
  });

  it("refuses a due date that is not a real date", () => {
    expect(addSubtask(task(), { title: "x", dueDate: "2026-02-30" }, "a", NOW)).toEqual({
      ok: false,
      error: "Due date is not a valid date.",
    });
  });

  it("allows 50 subtasks and refuses a 51st", () => {
    expect(MAX_SUBTASKS).toBe(50);
    expect(addSubtask(task(many(49)), { title: "x" }, "last", NOW).ok).toBe(true);
    expect(addSubtask(task(many(50)), { title: "x" }, "over", NOW)).toEqual({
      ok: false,
      error: "A task can have up to 50 subtasks.",
    });
  });
});

describe("editSubtask", () => {
  const parent = task([sub("a", { done: true }), sub("b"), sub("c")]);

  it("replaces the title, priority, and due date and keeps done and the position", () => {
    const result = editSubtask(parent, "a", { title: " Renamed ", priority: "high", dueDate: "2026-10-30" }, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.task.subtasks?.[0]).toEqual({
      id: "a",
      title: "Renamed",
      priority: "high",
      dueDate: "2026-10-30",
      done: true,
    });
    expect(result.task.subtasks?.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(result.task.updatedAt).toBe(NOW.toISOString());
  });

  it("can clear the due date", () => {
    const withDate = task([sub("a", { dueDate: "2026-10-30" })]);
    const result = editSubtask(withDate, "a", { title: "x", priority: "medium", dueDate: null }, NOW);
    expect(result.ok && result.task.subtasks?.[0]?.dueDate).toBeNull();
  });

  it("refuses a blank title or a bad date", () => {
    expect(editSubtask(parent, "a", { title: " ", priority: "low", dueDate: null }, NOW)).toEqual({
      ok: false,
      error: "Title is required.",
    });
    expect(editSubtask(parent, "a", { title: "x", priority: "low", dueDate: "nope" }, NOW)).toEqual({
      ok: false,
      error: "Due date is not a valid date.",
    });
  });

  it("refuses an unknown subtask", () => {
    expect(editSubtask(parent, "zzz", { title: "x", priority: "low", dueDate: null }, NOW)).toEqual({
      ok: false,
      error: "That subtask no longer exists.",
    });
  });

  it("does not change the input", () => {
    editSubtask(parent, "a", { title: "Renamed", priority: "high", dueDate: null }, NOW);
    expect(parent.subtasks?.[0]?.title).toBe("Step a");
  });
});

describe("setSubtaskDone", () => {
  it("marks one done without offering completion while others remain", () => {
    const result = setSubtaskDone(task([sub("a"), sub("b")]), "a", true, NOW);
    expect(result.task.subtasks?.map((s) => s.done)).toEqual([true, false]);
    expect(result.offerComplete).toBe(false);
    expect(result.task.updatedAt).toBe(NOW.toISOString());
  });

  it("offers completion when the last one is marked done on an open task", () => {
    const result = setSubtaskDone(task([sub("a", { done: true }), sub("b")]), "b", true, NOW);
    expect(result.offerComplete).toBe(true);
    expect(result.task.status).toBe("todo");
  });

  it("offers completion for a task that is in progress", () => {
    const result = setSubtaskDone(task([sub("a")], { status: "in-progress" }), "a", true, NOW);
    expect(result.offerComplete).toBe(true);
  });

  it("does not offer when the task is already completed", () => {
    const result = setSubtaskDone(task([sub("a")], { status: "completed" }), "a", true, NOW);
    expect(result.offerComplete).toBe(false);
  });

  it("does not offer when unticking", () => {
    const result = setSubtaskDone(task([sub("a", { done: true })]), "a", false, NOW);
    expect(result.task.subtasks?.[0]?.done).toBe(false);
    expect(result.offerComplete).toBe(false);
  });

  it("leaves the task unchanged and offers nothing for an unknown id", () => {
    const original = task([sub("a")]);
    const result = setSubtaskDone(original, "zzz", true, NOW);
    expect(result.task).toBe(original);
    expect(result.offerComplete).toBe(false);
  });

  it("never changes the status of the task", () => {
    const result = setSubtaskDone(task([sub("a")]), "a", true, NOW);
    expect(result.task.status).toBe("todo");
  });

  it("does not change the input", () => {
    const original = task([sub("a")]);
    setSubtaskDone(original, "a", true, NOW);
    expect(original.subtasks?.[0]?.done).toBe(false);
  });
});

describe("deleteSubtask", () => {
  it("removes the subtask and keeps the order of the rest", () => {
    const result = deleteSubtask(task([sub("a"), sub("b"), sub("c")]), "b", NOW);
    expect(result.subtasks?.map((s) => s.id)).toEqual(["a", "c"]);
    expect(result.updatedAt).toBe(NOW.toISOString());
  });

  it("removes the field when none are left", () => {
    const result = deleteSubtask(task([sub("a")]), "a", NOW);
    expect(result).not.toHaveProperty("subtasks");
  });

  it("leaves the task as it was for an unknown id", () => {
    const original = task([sub("a")]);
    expect(deleteSubtask(original, "zzz", NOW)).toBe(original);
  });
});

describe("moveSubtask", () => {
  const parent = task([sub("a"), sub("b"), sub("c")]);

  it("moves a subtask up and reports its new 1-based position", () => {
    const result = moveSubtask(parent, "c", "up", NOW);
    expect(result?.task.subtasks?.map((s) => s.id)).toEqual(["a", "c", "b"]);
    expect(result).toMatchObject({ position: 2, total: 3 });
    expect(result?.task.updatedAt).toBe(NOW.toISOString());
  });

  it("moves a subtask down", () => {
    const result = moveSubtask(parent, "a", "down", NOW);
    expect(result?.task.subtasks?.map((s) => s.id)).toEqual(["b", "a", "c"]);
    expect(result).toMatchObject({ position: 2, total: 3 });
  });

  it("returns null at either end and for an unknown id", () => {
    expect(moveSubtask(parent, "a", "up", NOW)).toBeNull();
    expect(moveSubtask(parent, "c", "down", NOW)).toBeNull();
    expect(moveSubtask(parent, "zzz", "up", NOW)).toBeNull();
    expect(moveSubtask(task(), "a", "up", NOW)).toBeNull();
  });

  it("does not change the input and keeps every other field", () => {
    const result = moveSubtask(parent, "b", "up", NOW);
    expect(parent.subtasks?.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(result?.task.subtasks?.find((s) => s.id === "b")).toEqual(sub("b"));
  });
});

describe("progress", () => {
  it("counts the done subtasks out of all of them", () => {
    expect(progress(task([sub("a", { done: true }), sub("b"), sub("c", { done: true })]))).toEqual({
      done: 2,
      total: 3,
    });
  });

  it("is 0 of 0 for a task with none", () => {
    expect(progress(task())).toEqual({ done: 0, total: 0 });
  });

  it("stays true through any sequence of operations (SC-002)", () => {
    let current = task();
    const ids = ["a", "b", "c", "d", "e"];
    for (const id of ids) {
      const added = addSubtask(current, { title: id }, id, NOW);
      if (added.ok) current = added.task;
    }
    current = setSubtaskDone(current, "b", true, NOW).task;
    current = setSubtaskDone(current, "d", true, NOW).task;
    current = moveSubtask(current, "d", "up", NOW)?.task ?? current;
    current = deleteSubtask(current, "a", NOW);
    current = setSubtaskDone(current, "b", false, NOW).task;
    const edited = editSubtask(current, "e", { title: "E2", priority: "high", dueDate: null }, NOW);
    if (edited.ok) current = edited.task;
    const actual = current.subtasks ?? [];
    expect(progress(current)).toEqual({ done: actual.filter((s) => s.done).length, total: actual.length });
    expect(progress(current)).toEqual({ done: 1, total: 4 });
  });
});

describe("describeProgress", () => {
  it("writes N of M subtasks complete", () => {
    expect(describeProgress({ done: 2, total: 5 })).toBe("2 of 5 subtasks complete");
    expect(describeProgress({ done: 0, total: 2 })).toBe("0 of 2 subtasks complete");
  });

  it("uses the singular for a single subtask", () => {
    expect(describeProgress({ done: 0, total: 1 })).toBe("0 of 1 subtask complete");
    expect(describeProgress({ done: 1, total: 1 })).toBe("1 of 1 subtask complete");
  });
});

describe("isSubtaskOverdue", () => {
  const today = "2026-10-15";
  const open = task([], { status: "todo" });

  it("is true for a subtask that is not done, due before today, under an open parent", () => {
    expect(isSubtaskOverdue(sub("a", { dueDate: "2026-10-14" }), open, today)).toBe(true);
  });

  it("is false when it is done, has no date, is due today or later, or the parent is completed", () => {
    expect(isSubtaskOverdue(sub("a", { dueDate: "2026-10-14", done: true }), open, today)).toBe(false);
    expect(isSubtaskOverdue(sub("a"), open, today)).toBe(false);
    expect(isSubtaskOverdue(sub("a", { dueDate: "2026-10-15" }), open, today)).toBe(false);
    expect(isSubtaskOverdue(sub("a", { dueDate: "2026-10-16" }), open, today)).toBe(false);
    expect(isSubtaskOverdue(sub("a", { dueDate: "2026-10-14" }), task([], { status: "completed" }), today)).toBe(false);
  });
});

describe("completeSubtasks and copySubtasks", () => {
  const list = [
    sub("a", { done: true, priority: "high", dueDate: "2026-10-20" }),
    sub("b", { title: "Second" }),
  ];

  it("completeSubtasks marks every one done and keeps ids, order, and details", () => {
    const result = completeSubtasks(list);
    expect(result.map((s) => s.done)).toEqual([true, true]);
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
    expect(result[1]?.title).toBe("Second");
    expect(list[1]?.done).toBe(false);
  });

  it("copySubtasks gives new ids, none done, and the same details in the same order", () => {
    const copy = copySubtasks(list, "next");
    expect(copy.map((s) => s.id)).toEqual(["next:1", "next:2"]);
    expect(copy.map((s) => s.done)).toEqual([false, false]);
    expect(copy[0]).toMatchObject({ title: "Step a", priority: "high", dueDate: "2026-10-20" });
    expect(copy[1]?.title).toBe("Second");
    expect(list[0]?.done).toBe(true);
  });
});

describe("isSubtaskList", () => {
  it("accepts 1 to 50 valid subtasks", () => {
    expect(isSubtaskList([sub("a")])).toBe(true);
    expect(isSubtaskList(many(50))).toBe(true);
    expect(isSubtaskList([sub("a", { dueDate: "2026-10-20", done: true, priority: "low" })])).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSubtaskList([])).toBe(false);
    expect(isSubtaskList(many(51))).toBe(false);
    expect(isSubtaskList("nope")).toBe(false);
    expect(isSubtaskList(null)).toBe(false);
    expect(isSubtaskList([sub("a"), sub("a")])).toBe(false);
    expect(isSubtaskList([sub("")])).toBe(false);
    expect(isSubtaskList([sub("a", { title: "  " })])).toBe(false);
    expect(isSubtaskList([{ ...sub("a"), priority: "urgent" }])).toBe(false);
    expect(isSubtaskList([{ ...sub("a"), dueDate: "2026-02-30" }])).toBe(false);
    expect(isSubtaskList([{ ...sub("a"), dueDate: undefined }])).toBe(false);
    expect(isSubtaskList([{ ...sub("a"), done: "yes" }])).toBe(false);
    expect(isSubtaskList([5])).toBe(false);
  });
});

describe("dropUnreadableSubtasks", () => {
  it("removes only an unreadable subtasks field and leaves everything else as it was", () => {
    const bad = { ...task(), subtasks: [{ id: "a" }] };
    const result = dropUnreadableSubtasks(bad);
    expect(result).toEqual(task());
    expect(result).not.toHaveProperty("subtasks");
    expect(bad.subtasks).toHaveLength(1);
  });

  it("returns valid and absent subtasks, and non-records, untouched", () => {
    const valid = task([sub("a")]);
    expect(dropUnreadableSubtasks(valid)).toBe(valid);
    const none = task();
    expect(dropUnreadableSubtasks(none)).toBe(none);
    expect(dropUnreadableSubtasks("text")).toBe("text");
    expect(dropUnreadableSubtasks(null)).toBeNull();
  });

  it("drops an empty list, which is never stored", () => {
    expect(dropUnreadableSubtasks({ ...task(), subtasks: [] })).not.toHaveProperty("subtasks");
  });
});

describe("time", () => {
  it("uses the given clock", () => {
    const result = addSubtask(task(), { title: "x" }, "a", LATER);
    expect(result.ok && result.task.updatedAt).toBe(LATER.toISOString());
  });
});
