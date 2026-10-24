import { describe, expect, it } from "vitest";
import {
  completeOccurrence,
  createOccurrence,
  deleteOccurrence,
  openOccurrence,
  previewsFor,
  saveOccurrence,
  stopSeries,
  type ChangeSet,
} from "../../src/domain/series";
import type { Recurrence } from "../../src/domain/recurrence";
import type { Task } from "../../src/domain/task";

const NOW = new Date("2026-10-15T09:00:00.000Z");
const IDS = { newId: "new-1", seriesId: "series-new" };

const weekly: Recurrence = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: null };
const daily: Recurrence = { kind: "daily", weekdays: [], dayOfMonth: null, endDate: null };
const monthly31: Recurrence = { kind: "monthly", weekdays: [], dayOfMonth: 31, endDate: null };

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

/** The series own details, which every later occurrence is made from. */
function templateOf(t: Task) {
  return { title: t.title, description: t.description, priority: t.priority, tags: t.tags };
}

/**
 * A task that belongs to series `s1` with the given rule. Unless a template is given, the series
 * own details are the task details.
 */
function occ(id: string, due: string, overrides: Partial<Task> = {}): Task {
  const made = task(id, { dueDate: due, recurrence: weekly, seriesId: "s1", title: "Water plants", ...overrides });
  return { ...made, seriesTemplate: overrides.seriesTemplate ?? templateOf(made) };
}

/** Apply a change set the way the app does. */
function apply(tasks: Task[], change: ChangeSet): Task[] {
  const removed = new Set(change.remove);
  const upserts = new Map(change.upsert.map((t) => [t.id, t]));
  const kept = tasks.filter((t) => !removed.has(t.id)).map((t) => upserts.get(t.id) ?? t);
  const added = change.upsert.filter((t) => !tasks.some((existing) => existing.id === t.id));
  return [...added, ...kept];
}

function openCount(tasks: Task[], seriesId: string): number {
  return tasks.filter((t) => t.seriesId === seriesId && t.status !== "completed").length;
}

describe("completeOccurrence", () => {
  it("completes the task and adds the next occurrence with the copied details", () => {
    const open = occ("a", "2026-10-15", {
      description: "Every plant",
      priority: "high",
      tags: ["home"],
      status: "in-progress",
    });
    const change = completeOccurrence([open], open, NOW, "next-1");

    expect(change.outcome).toBe("next");
    expect(change.remove).toEqual([]);
    const completed = change.upsert.find((t) => t.id === "a");
    expect(completed).toMatchObject({ status: "completed", dueDate: "2026-10-15", updatedAt: NOW.toISOString() });
    expect(completed?.recurrence).toEqual(weekly);

    expect(change.next).toEqual({
      id: "next-1",
      title: "Water plants",
      description: "Every plant",
      priority: "high",
      status: "todo",
      dueDate: "2026-10-22",
      tags: ["home"],
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      recurrence: weekly,
      seriesId: "s1",
      seriesTemplate: { title: "Water plants", description: "Every plant", priority: "high", tags: ["home"] },
    });
    expect(change.upsert).toContainEqual(change.next);
  });

  it("works from the scheduled due date, not from the day it is completed", () => {
    const late = occ("a", "2026-10-01", { recurrence: daily });
    const change = completeOccurrence([late], late, NOW, "n");
    expect(change.next?.dueDate).toBe("2026-10-02");
  });

  it("follows the rule through month ends", () => {
    const jan = occ("a", "2026-01-31", { recurrence: monthly31 });
    const feb = completeOccurrence([jan], jan, NOW, "n").next;
    expect(feb?.dueDate).toBe("2026-02-28");
    const mar = feb && completeOccurrence([feb], feb, NOW, "n2").next;
    expect(mar?.dueDate).toBe("2026-03-31");
  });

  it("makes the next occurrence from the series own details, not from a one-off edit of this one", () => {
    const edited = occ("a", "2026-10-15", {
      title: "Just today",
      priority: "high",
      seriesTemplate: { title: "Water plants", description: "", priority: "medium", tags: ["home"] },
    });
    const next = completeOccurrence([edited], edited, NOW, "n").next;
    expect(next).toMatchObject({ title: "Water plants", priority: "medium", tags: ["home"], description: "" });
    expect(next?.seriesTemplate).toEqual({ title: "Water plants", description: "", priority: "medium", tags: ["home"] });
  });

  it("falls back to the occurrence own details when it has no template (older data)", () => {
    const { seriesTemplate: _unused, ...legacy } = occ("a", "2026-10-15", { title: "Legacy", priority: "low" });
    const next = completeOccurrence([legacy], legacy, NOW, "n").next;
    expect(next).toMatchObject({ title: "Legacy", priority: "low" });
    expect(next?.seriesTemplate).toEqual({ title: "Legacy", description: "", priority: "low", tags: [] });
  });

  it("copies the tags instead of sharing the array", () => {
    const open = occ("a", "2026-10-15", { tags: ["x"] });
    const next = completeOccurrence([open], open, NOW, "n").next;
    expect(next?.tags).toEqual(["x"]);
    expect(next?.tags).not.toBe(open.tags);
  });

  it("ends the series when no date is left before the end date, and the series becomes ordinary tasks", () => {
    const rule: Recurrence = { ...weekly, endDate: "2026-10-21" };
    const history = occ("old", "2026-10-08", { status: "completed", recurrence: rule });
    const last = occ("a", "2026-10-15", { recurrence: rule });
    const other = task("other", { dueDate: "2026-10-15" });
    const change = completeOccurrence([last, history, other], last, NOW, "n");

    expect(change.outcome).toBe("last");
    expect(change.next).toBeNull();
    const after = apply([last, history, other], change);
    for (const t of after.filter((x) => x.id !== "other")) {
      expect(t).not.toHaveProperty("recurrence");
      expect(t).not.toHaveProperty("seriesId");
      expect(t).not.toHaveProperty("seriesTemplate");
    }
    expect(after.find((t) => t.id === "a")?.status).toBe("completed");
    expect(after.find((t) => t.id === "old")?.status).toBe("completed");
    expect(after).toHaveLength(3);
  });

  it("lets a date equal to the end date through", () => {
    const rule: Recurrence = { ...weekly, endDate: "2026-10-22" };
    const open = occ("a", "2026-10-15", { recurrence: rule });
    expect(completeOccurrence([open], open, NOW, "n").next?.dueDate).toBe("2026-10-22");
  });

  it("just completes an ordinary task", () => {
    const plain = task("p", { dueDate: "2026-10-15" });
    const change = completeOccurrence([plain], plain, NOW, "n");
    expect(change.outcome).toBe("done");
    expect(change.next).toBeNull();
    expect(change.upsert).toHaveLength(1);
    expect(change.upsert[0]).toMatchObject({ id: "p", status: "completed" });
  });

  it("does nothing when the task is already completed (no second next occurrence)", () => {
    const done = occ("a", "2026-10-15", { status: "completed" });
    const change = completeOccurrence([done], done, NOW, "n");
    expect(change).toEqual({ upsert: [], remove: [], outcome: null, next: null });
  });

  it("changes no other task, and never completes a later occurrence", () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    const open = occ("a", "2026-10-15");
    const bystander = task("b", { dueDate: "2026-10-16" });
    const before = [open, history, bystander];
    const after = apply(before, completeOccurrence(before, open, NOW, "n"));

    expect(after.find((t) => t.id === "old")).toBe(history);
    expect(after.find((t) => t.id === "b")).toBe(bystander);
    expect(after.filter((t) => t.status === "completed").map((t) => t.id).sort()).toEqual(["a", "old"]);
    expect(openCount(after, "s1")).toBe(1);
  });

  it("keeps exactly one open occurrence through a long run of completions", () => {
    let list: Task[] = [occ("o0", "2026-10-15", { recurrence: daily })];
    for (let i = 1; i <= 40; i++) {
      const open = openOccurrence(list, "s1");
      if (!open) throw new Error("no open occurrence");
      list = apply(list, completeOccurrence(list, open, NOW, `o${i}`));
      expect(openCount(list, "s1")).toBe(1);
    }
    expect(openOccurrence(list, "s1")?.dueDate).toBe("2026-11-24");
    expect(list.filter((t) => t.status === "completed")).toHaveLength(40);
  });
});

describe("saveOccurrence: tasks that are not in a series", () => {
  const plain = task("p", { dueDate: "2026-10-15", title: "Plain" });

  it("makes an ordinary update when no rule is asked for", () => {
    const result = saveOccurrence([plain], plain, { title: "Renamed" }, "occurrence", NOW, IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.upsert).toHaveLength(1);
    expect(result.changes.upsert[0]).toMatchObject({ id: "p", title: "Renamed" });
    expect(result.changes.outcome).toBeNull();
    expect(result.changes.upsert[0]).not.toHaveProperty("recurrence");
  });

  it("starts a new series when a rule is asked for", () => {
    const result = saveOccurrence([plain], plain, { title: "Plain", recurrence: weekly }, "occurrence", NOW, IDS);
    expect(result.ok && result.changes.upsert[0]).toMatchObject({
      id: "p",
      recurrence: weekly,
      seriesId: "series-new",
      seriesTemplate: { title: "Plain", description: "", priority: "medium", tags: [] },
    });
  });

  it("completes and creates the next occurrence when it joins a series and is completed at once", () => {
    const result = saveOccurrence(
      [plain],
      plain,
      { title: "Plain", status: "completed", recurrence: weekly },
      "occurrence",
      NOW,
      IDS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.outcome).toBe("next");
    expect(result.changes.next).toMatchObject({ id: "new-1", dueDate: "2026-10-22", status: "todo", seriesId: "series-new" });
  });

  it("creates no next occurrence when an ordinary task is completed through the form", () => {
    const result = saveOccurrence([plain], plain, { title: "Plain", status: "completed" }, "occurrence", NOW, IDS);
    expect(result.ok && result.changes.outcome).toBe("done");
    expect(result.ok && result.changes.next).toBeNull();
  });

  it("refuses a rule without a due date", () => {
    const noDate = task("n", { title: "No date" });
    const result = saveOccurrence([noDate], noDate, { title: "No date", recurrence: weekly }, "occurrence", NOW, IDS);
    expect(result).toEqual({ ok: false, error: "Choose a due date to start the repeat from." });
  });

  it("refuses an empty title", () => {
    const result = saveOccurrence([plain], plain, { title: "  " }, "occurrence", NOW, IDS);
    expect(result).toEqual({ ok: false, error: "Title is required." });
  });
});

describe("saveOccurrence: scope 'occurrence' in a series", () => {
  const history = occ("old", "2026-10-08", { status: "completed" });
  const open = occ("a", "2026-10-15");
  const list = [open, history];

  it("changes this task only and leaves the rule alone", () => {
    const result = saveOccurrence(
      list,
      open,
      { title: "Special", description: "Once", priority: "high", tags: ["x"], dueDate: "2026-10-16" },
      "occurrence",
      NOW,
      IDS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.upsert).toHaveLength(1);
    expect(result.changes.upsert[0]).toMatchObject({
      id: "a",
      title: "Special",
      priority: "high",
      dueDate: "2026-10-16",
      recurrence: weekly,
      seriesId: "s1",
    });
  });

  it("ignores a new rule in the input, since the rule belongs to the series", () => {
    const result = saveOccurrence(list, open, { title: "Water plants", recurrence: daily }, "occurrence", NOW, IDS);
    expect(result.ok && result.changes.upsert[0]?.recurrence).toEqual(weekly);
    const cleared = saveOccurrence(list, open, { title: "Water plants", recurrence: null }, "occurrence", NOW, IDS);
    expect(cleared.ok && cleared.changes.upsert[0]?.recurrence).toEqual(weekly);
  });

  it("leaves the series own details alone, so the next occurrence does not inherit the edit", () => {
    const edited = saveOccurrence(list, open, { title: "Just today", priority: "high" }, "occurrence", NOW, IDS);
    if (!edited.ok) throw new Error("save failed");
    const updated = apply(list, edited.changes);
    expect(updated.find((t) => t.id === "a")).toMatchObject({ title: "Just today", priority: "high" });
    expect(updated.find((t) => t.id === "a")?.seriesTemplate).toEqual(templateOf(open));
    expect(updated.find((t) => t.id === "old")).toBe(history);

    const current = openOccurrence(updated, "s1");
    if (!current) throw new Error("no open occurrence");
    const next = completeOccurrence(updated, current, NOW, "n").next;
    expect(next).toMatchObject({ title: "Water plants", priority: "medium" });
  });

  it("completes through the form and creates the next occurrence once", () => {
    const result = saveOccurrence(list, open, { title: "Water plants", status: "completed" }, "occurrence", NOW, IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.outcome).toBe("next");
    const after = apply(list, result.changes);
    expect(after.filter((t) => t.id === "new-1")).toHaveLength(1);
    expect(openCount(after, "s1")).toBe(1);
  });

  it("does not create another occurrence when a completed one is edited and stays completed", () => {
    const result = saveOccurrence(list, history, { title: "Renamed history", status: "completed" }, "occurrence", NOW, IDS);
    expect(result.ok && result.changes.next).toBeNull();
    expect(result.ok && result.changes.upsert).toHaveLength(1);
  });

  it("reopening a completed occurrence while a newer open one exists makes it an ordinary task", () => {
    const result = saveOccurrence(list, history, { title: "Water plants", status: "todo" }, "occurrence", NOW, IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reopened = result.changes.upsert[0];
    expect(reopened).toMatchObject({ id: "old", status: "todo" });
    expect(reopened).not.toHaveProperty("recurrence");
    expect(reopened).not.toHaveProperty("seriesId");
    expect(reopened).not.toHaveProperty("seriesTemplate");
    expect(openCount(apply(list, result.changes), "s1")).toBe(1);
  });

  it("reopening a completed occurrence when the series has no open one keeps it in the series", () => {
    const lonely = [history];
    const result = saveOccurrence(lonely, history, { title: "Water plants", status: "in-progress" }, "occurrence", NOW, IDS);
    expect(result.ok && result.changes.upsert[0]).toMatchObject({ status: "in-progress", seriesId: "s1", recurrence: weekly });
  });

  it("refuses to remove the due date of a recurring occurrence", () => {
    const result = saveOccurrence(list, open, { title: "Water plants", dueDate: null }, "occurrence", NOW, IDS);
    expect(result).toEqual({ ok: false, error: "Choose a due date to start the repeat from." });
  });
});

describe("saveOccurrence: scope 'series' in a series", () => {
  const history = occ("old", "2026-10-08", { status: "completed", title: "Old title" });
  const open = occ("a", "2026-10-15", { priority: "low" });
  const list = [open, history];

  it("applies the series fields to the open occurrence and leaves completed ones alone", () => {
    const newRule: Recurrence = { kind: "days", weekdays: [0, 2], dayOfMonth: null, endDate: "2026-12-31" };
    const result = saveOccurrence(
      list,
      open,
      { title: "New title", description: "New", priority: "high", tags: ["t"], recurrence: newRule },
      "series",
      NOW,
      IDS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.upsert).toHaveLength(1);
    expect(result.changes.upsert[0]).toMatchObject({
      id: "a",
      title: "New title",
      description: "New",
      priority: "high",
      tags: ["t"],
      recurrence: newRule,
      seriesId: "s1",
      seriesTemplate: { title: "New title", description: "New", priority: "high", tags: ["t"] },
    });
    expect(apply(list, result.changes).find((t) => t.id === "old")).toBe(history);
  });

  it("gives every occurrence created afterwards the series changes", () => {
    const result = saveOccurrence(list, open, { title: "New title", priority: "high" }, "series", NOW, IDS);
    if (!result.ok) throw new Error("save failed");
    const updated = apply(list, result.changes);
    const current = openOccurrence(updated, "s1");
    if (!current) throw new Error("no open occurrence");
    const next = completeOccurrence(updated, current, NOW, "n").next;
    expect(next).toMatchObject({ title: "New title", priority: "high" });
  });

  it("applies the due date and status to this occurrence even with the series scope", () => {
    const result = saveOccurrence(
      list,
      open,
      { title: "Water plants", dueDate: "2026-10-17", status: "in-progress" },
      "series",
      NOW,
      IDS,
    );
    expect(result.ok && result.changes.upsert[0]).toMatchObject({ dueDate: "2026-10-17", status: "in-progress" });
  });

  it("completes the open occurrence and creates the next one, with the series changes applied", () => {
    const result = saveOccurrence(list, open, { title: "Renamed", status: "completed" }, "series", NOW, IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.outcome).toBe("next");
    expect(result.changes.next).toMatchObject({ title: "Renamed", status: "todo", dueDate: "2026-10-22" });
  });

  it("when editing a completed occurrence, changes the open one and leaves the completed one untouched", () => {
    const result = saveOccurrence(
      list,
      history,
      { title: "From history", priority: "high", dueDate: "2026-01-01", status: "todo" },
      "series",
      NOW,
      IDS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.upsert).toHaveLength(1);
    expect(result.changes.upsert[0]).toMatchObject({
      id: "a",
      title: "From history",
      priority: "high",
      dueDate: "2026-10-15",
      status: "todo",
      seriesTemplate: { title: "From history", description: "", priority: "high", tags: [] },
    });
  });

  it("a null rule stops the series: nothing in it repeats any more", () => {
    const result = saveOccurrence(list, open, { title: "Water plants", recurrence: null }, "series", NOW, IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const t of apply(list, result.changes)) {
      expect(t).not.toHaveProperty("recurrence");
      expect(t).not.toHaveProperty("seriesId");
      expect(t).not.toHaveProperty("seriesTemplate");
    }
    expect(apply(list, result.changes)).toHaveLength(2);
  });

  it("falls back to this occurrence only when the series has no open occurrence", () => {
    const lonely = [history];
    const result = saveOccurrence(lonely, history, { title: "Only me" }, "series", NOW, IDS);
    expect(result.ok && result.changes.upsert).toHaveLength(1);
    expect(result.ok && result.changes.upsert[0]).toMatchObject({ id: "old", title: "Only me" });
  });

  it("changing the rule keeps the series id", () => {
    const result = saveOccurrence(list, open, { title: "Water plants", recurrence: daily }, "series", NOW, IDS);
    expect(result.ok && result.changes.upsert[0]?.seriesId).toBe("s1");
  });
});

describe("stopSeries", () => {
  it("removes the rule and series from every task in the series and touches nothing else", () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    const open = occ("a", "2026-10-15");
    const other = occ("z", "2026-10-15", { seriesId: "s2" });
    const plain = task("p");
    const tasks = [open, history, other, plain];
    const change = stopSeries(tasks, "s1", NOW);

    expect(change.outcome).toBeNull();
    expect(change.remove).toEqual([]);
    expect(change.upsert.map((t) => t.id).sort()).toEqual(["a", "old"]);
    for (const t of change.upsert) {
      expect(t).not.toHaveProperty("recurrence");
      expect(t).not.toHaveProperty("seriesId");
      expect(t).not.toHaveProperty("seriesTemplate");
    }
    const after = apply(tasks, change);
    expect(after.find((t) => t.id === "z")).toBe(other);
    expect(after.find((t) => t.id === "p")).toBe(plain);
    expect(after.find((t) => t.id === "old")?.status).toBe("completed");
  });

  it("creates nothing when the stopped task is completed afterwards", () => {
    const open = occ("a", "2026-10-15");
    const after = apply([open], stopSeries([open], "s1", NOW));
    const stopped = after.find((t) => t.id === "a");
    if (!stopped) throw new Error("missing");
    const change = completeOccurrence(after, stopped, NOW, "n");
    expect(change.outcome).toBe("done");
    expect(change.next).toBeNull();
  });

  it("marks the open occurrence as updated but keeps history timestamps", () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    const open = occ("a", "2026-10-15");
    const change = stopSeries([open, history], "s1", NOW);
    expect(change.upsert.find((t) => t.id === "a")?.updatedAt).toBe(NOW.toISOString());
    expect(change.upsert.find((t) => t.id === "old")?.updatedAt).toBe(history.updatedAt);
  });
});

describe("deleteOccurrence", () => {
  it("removes an ordinary task and nothing else", () => {
    const plain = task("p");
    expect(deleteOccurrence([plain, task("q")], plain, NOW)).toEqual({
      upsert: [],
      remove: ["p"],
      outcome: null,
      next: null,
    });
  });

  it("removes the open occurrence and ends the series for the rest", () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    const open = occ("a", "2026-10-15");
    const change = deleteOccurrence([open, history], open, NOW);
    expect(change.remove).toEqual(["a"]);
    expect(change.upsert.map((t) => t.id)).toEqual(["old"]);
    expect(change.upsert[0]).not.toHaveProperty("seriesId");
    expect(apply([open, history], change)).toHaveLength(1);
  });

  it("removes only a completed occurrence and leaves the live series alone", () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    const open = occ("a", "2026-10-15");
    const change = deleteOccurrence([open, history], history, NOW);
    expect(change.remove).toEqual(["old"]);
    expect(change.upsert).toEqual([]);
  });
});

describe("openOccurrence", () => {
  it("finds the series' task that is not completed", () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    const open = occ("a", "2026-10-15");
    expect(openOccurrence([history, open], "s1")).toBe(open);
  });

  it("returns undefined when every occurrence is completed or the series is unknown", () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    expect(openOccurrence([history], "s1")).toBeUndefined();
    expect(openOccurrence([history], "nope")).toBeUndefined();
  });

  it("counts in-progress as open", () => {
    const working = occ("a", "2026-10-15", { status: "in-progress" });
    expect(openOccurrence([working], "s1")).toBe(working);
  });
});

describe("previewsFor", () => {
  const TODAY = "2026-10-15";

  it("gives the rule's dates in the range after the due date and after today", () => {
    const open = occ("a", "2026-10-15");
    expect(previewsFor([open], "2026-10-01", "2026-11-12", TODAY).map((p) => p.date)).toEqual([
      "2026-10-22",
      "2026-10-29",
      "2026-11-05",
      "2026-11-12",
    ]);
  });

  it("returns each preview with the open occurrence it comes from", () => {
    const open = occ("a", "2026-10-15");
    const [first] = previewsFor([open], "2026-10-01", "2026-10-31", TODAY);
    expect(first?.task).toBe(open);
  });

  it("shows the series own title and priority, not a one-off edit of the open occurrence", () => {
    const edited = occ("a", "2026-10-15", {
      title: "Just today",
      priority: "high",
      seriesTemplate: { title: "Water plants", description: "", priority: "low", tags: [] },
    });
    const [first] = previewsFor([edited], "2026-10-20", "2026-10-31", TODAY);
    expect(first).toMatchObject({ title: "Water plants", priority: "low" });
  });

  it("falls back to the open occurrence own details when it has no template", () => {
    const { seriesTemplate: _unused, ...legacy } = occ("a", "2026-10-15", { title: "Legacy", priority: "high" });
    const [first] = previewsFor([legacy], "2026-10-20", "2026-10-31", TODAY);
    expect(first).toMatchObject({ title: "Legacy", priority: "high" });
  });

  it("starts after today when the open occurrence is overdue, so no preview is in the past", () => {
    const overdue = occ("a", "2026-10-01", { recurrence: daily });
    const dates = previewsFor([overdue], "2026-10-10", "2026-10-18", TODAY).map((p) => p.date);
    expect(dates).toEqual(["2026-10-16", "2026-10-17", "2026-10-18"]);
  });

  it("starts after the due date when it is in the future", () => {
    const future = occ("a", "2026-10-20", { recurrence: daily });
    expect(previewsFor([future], "2026-10-15", "2026-10-23", TODAY).map((p) => p.date)).toEqual([
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
    ]);
  });

  it("stops at the end date", () => {
    const open = occ("a", "2026-10-15", { recurrence: { ...weekly, endDate: "2026-11-01" } });
    expect(previewsFor([open], "2026-10-01", "2026-12-31", TODAY).map((p) => p.date)).toEqual([
      "2026-10-22",
      "2026-10-29",
    ]);
  });

  it("ignores completed occurrences, ordinary tasks, and tasks outside the range", () => {
    const done = occ("old", "2026-10-08", { status: "completed" });
    const plain = task("p", { dueDate: "2026-10-16" });
    expect(previewsFor([done, plain], "2026-10-01", "2026-12-31", TODAY)).toEqual([]);
    const open = occ("a", "2026-10-15");
    expect(previewsFor([open], "2027-03-01", "2027-03-31", TODAY).length).toBeGreaterThan(0);
    expect(previewsFor([open], "2026-09-01", "2026-10-14", TODAY)).toEqual([]);
  });

  it("covers several series and orders previews by date, then title", () => {
    const water = occ("a", "2026-10-15", { title: "Water plants" });
    const rent = occ("r", "2026-10-15", { title: "Pay rent", seriesId: "s2", recurrence: weekly });
    const result = previewsFor([water, rent], "2026-10-20", "2026-10-25", TODAY);
    expect(result.map((p) => `${p.date} ${p.title}`)).toEqual(["2026-10-22 Pay rent", "2026-10-22 Water plants"]);
  });

  it("gives one set of previews per series even if imported data has two open occurrences", () => {
    const first = occ("a", "2026-10-15");
    const second = occ("b", "2026-10-16");
    expect(previewsFor([first, second], "2026-10-20", "2026-10-25", TODAY)).toHaveLength(1);
  });

  it("works for a series that began long ago without walking its history", () => {
    const ancient = occ("a", "2020-01-02", { recurrence: daily });
    const result = previewsFor([ancient], "2026-10-26", "2026-11-01", TODAY);
    expect(result).toHaveLength(7);
  });

  it("moves with the open occurrence's due date", () => {
    const moved = occ("a", "2026-10-30", { recurrence: weekly });
    expect(previewsFor([moved], "2026-10-15", "2026-11-12", TODAY).map((p) => p.date)).toEqual([
      "2026-11-05",
      "2026-11-12",
    ]);
  });
});

describe("createOccurrence", () => {
  const CREATE_IDS = { taskId: "task-1", newId: "new-1", seriesId: "series-new" };

  it("creates an ordinary task when no rule is asked for", () => {
    const result = createOccurrence({ title: "Plain", dueDate: "2026-10-15" }, NOW, CREATE_IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.upsert).toHaveLength(1);
    expect(result.changes.upsert[0]).toMatchObject({ id: "task-1", title: "Plain" });
    expect(result.changes.upsert[0]).not.toHaveProperty("recurrence");
    expect(result.changes.upsert[0]).not.toHaveProperty("seriesTemplate");
    expect(result.changes.outcome).toBeNull();
  });

  it("starts a series, with its own details as the template, when a rule is given", () => {
    const result = createOccurrence(
      { title: "Water plants", priority: "high", tags: ["home"], dueDate: "2026-10-15", recurrence: weekly },
      NOW,
      CREATE_IDS,
    );
    expect(result.ok && result.changes.upsert[0]).toMatchObject({
      id: "task-1",
      recurrence: weekly,
      seriesId: "series-new",
      seriesTemplate: { title: "Water plants", description: "", priority: "high", tags: ["home"] },
    });
  });

  it("completes and makes the next occurrence at once when a recurring task is created as completed", () => {
    const result = createOccurrence(
      { title: "Done already", status: "completed", dueDate: "2026-10-15", recurrence: weekly },
      NOW,
      CREATE_IDS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.outcome).toBe("next");
    expect(result.changes.upsert.map((t) => `${t.id}:${t.status}`)).toEqual(["task-1:completed", "new-1:todo"]);
    expect(result.changes.next).toMatchObject({ id: "new-1", dueDate: "2026-10-22", title: "Done already" });
  });

  it("refuses an empty title, and a rule without a due date", () => {
    expect(createOccurrence({ title: " " }, NOW, CREATE_IDS)).toEqual({ ok: false, error: "Title is required." });
    expect(createOccurrence({ title: "x", recurrence: weekly }, NOW, CREATE_IDS)).toEqual({
      ok: false,
      error: "Choose a due date to start the repeat from.",
    });
  });
});

describe("subtasks and series", () => {
  const steps = [
    { id: "a", title: "One", priority: "high" as const, dueDate: "2026-10-20", done: true },
    { id: "b", title: "Two", priority: "medium" as const, dueDate: null, done: false },
  ];

  it("completing an occurrence completes its subtasks and gives the next one a fresh copy", () => {
    const open = occ("a", "2026-10-15", { subtasks: steps });
    const change = completeOccurrence([open], open, NOW, "next-1");

    const completed = change.upsert.find((t) => t.id === "a");
    expect(completed?.subtasks?.map((s) => s.done)).toEqual([true, true]);
    expect(completed?.subtasks?.map((s) => s.id)).toEqual(["a", "b"]);

    expect(change.next?.subtasks).toEqual([
      { id: "next-1:1", title: "One", priority: "high", dueDate: "2026-10-20", done: false },
      { id: "next-1:2", title: "Two", priority: "medium", dueDate: null, done: false },
    ]);
  });

  it("gives the next occurrence no subtasks when the occurrence had none", () => {
    const open = occ("a", "2026-10-15");
    const change = completeOccurrence([open], open, NOW, "next-1");
    expect(change.next).not.toHaveProperty("subtasks");
  });

  it("keeps the completed task subtasks when the series ends", () => {
    const last = occ("a", "2026-10-15", { recurrence: { ...weekly, endDate: "2026-10-16" }, subtasks: steps });
    const change = completeOccurrence([last], last, NOW, "next-1");
    expect(change.outcome).toBe("last");
    expect(change.upsert[0]?.subtasks?.map((s) => s.done)).toEqual([true, true]);
  });

  it("completing a task through a form save completes the subtasks and copies them", () => {
    const open = occ("a", "2026-10-15", { subtasks: steps });
    const result = saveOccurrence([open], open, { title: open.title, status: "completed" }, "occurrence", NOW, IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes.upsert.find((t) => t.id === "a")?.subtasks?.every((s) => s.done)).toBe(true);
    expect(result.changes.next?.subtasks?.map((s) => s.done)).toEqual([false, false]);
  });

  it("stopping a series or deleting its open occurrence keeps the other tasks subtasks", () => {
    const history = occ("old", "2026-10-08", { status: "completed", subtasks: steps });
    const open = occ("a", "2026-10-15", { subtasks: steps });
    const stopped = stopSeries([open, history], "s1", NOW);
    expect(stopped.upsert.every((t) => t.subtasks?.length === 2)).toBe(true);

    const deleted = deleteOccurrence([open, history], open, NOW);
    expect(deleted.upsert.find((t) => t.id === "old")?.subtasks).toHaveLength(2);
  });

  it("an entire-series edit keeps the open occurrence subtasks", () => {
    const open = occ("a", "2026-10-15", { subtasks: steps });
    const result = saveOccurrence([open], open, { title: "Renamed" }, "series", NOW, IDS);
    expect(result.ok && result.changes.upsert[0]?.subtasks).toEqual(steps);
  });
});
