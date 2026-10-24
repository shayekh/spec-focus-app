import { describe, expect, it } from "vitest";
import { exportFilename, parseImport, serializeExport } from "../../src/domain/transfer";
import type { Recurrence } from "../../src/domain/recurrence";
import type { Task } from "../../src/domain/task";

const full: Task = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Plan trip",
  description: "Flights\nand hotel",
  priority: "high",
  status: "in-progress",
  dueDate: "2026-12-01",
  tags: ["travel", "Personal"],
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-02T09:30:00.000Z",
};

const minimal: Task = {
  id: "22222222-2222-2222-2222-222222222222",
  title: "Buy milk",
  description: "",
  priority: "low",
  status: "todo",
  dueDate: null,
  tags: [],
  createdAt: "2026-10-03T00:00:00.000Z",
  updatedAt: "2026-10-03T00:00:00.000Z",
};

function doc(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: "focus-app",
    version: 1,
    exportedAt: "2026-10-25T10:00:00.000Z",
    tasks: [full],
    ...overrides,
  });
}

describe("serializeExport", () => {
  it("writes the documented envelope", () => {
    const now = new Date("2026-10-25T10:00:00.000Z");
    const parsed = JSON.parse(serializeExport([full], now));
    expect(parsed).toEqual({
      app: "focus-app",
      version: 1,
      exportedAt: now.toISOString(),
      tasks: [full],
    });
  });

  it("round-trips every field exactly (SC-007)", () => {
    const result = parseImport(serializeExport([full, minimal]));
    expect(result).toEqual({ ok: true, tasks: [full, minimal] });
  });

  it("round-trips an empty list", () => {
    expect(parseImport(serializeExport([]))).toEqual({ ok: true, tasks: [] });
  });
});

describe("exportFilename", () => {
  it("uses the local date", () => {
    expect(exportFilename(new Date(2026, 9, 5, 23, 59))).toBe("focus-app-tasks-2026-10-05.json");
  });
});

describe("parseImport rejects invalid files", () => {
  const cases: [string, string][] = [
    ["non-JSON text", "this is not json"],
    ["a JSON array", "[]"],
    ["null", "null"],
    ["a different app", doc({ app: "other-app" })],
    ["an unsupported version", doc({ version: 2 })],
    ["a missing version", doc({ version: undefined })],
    ["tasks that is not an array", doc({ tasks: "nope" })],
    ["an invalid priority", doc({ tasks: [{ ...full, priority: "urgent" }] })],
    ["an invalid status", doc({ tasks: [{ ...full, status: "done" }] })],
    ["a missing title", doc({ tasks: [{ ...full, title: undefined }] })],
    ["an empty title", doc({ tasks: [{ ...full, title: "   " }] })],
    ["a bad due date", doc({ tasks: [{ ...full, dueDate: "2026-02-30" }] })],
    ["a non-array tags field", doc({ tasks: [{ ...full, tags: "a,b" }] })],
    ["a bad timestamp", doc({ tasks: [{ ...full, createdAt: "yesterday" }] })],
    ["duplicate ids", doc({ tasks: [full, { ...minimal, id: full.id }] })],
    ["one bad task among good ones", doc({ tasks: [full, { ...minimal, priority: "x" }] })],
  ];

  it.each(cases)("%s", (_name, text) => {
    const result = parseImport(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("import and export with recurring tasks", () => {
  const rule: Recurrence = { kind: "days", weekdays: [0, 2, 4], dayOfMonth: null, endDate: "2027-01-31" };
  const recurring: Task = {
    ...minimal,
    id: "33333333-3333-3333-3333-333333333333",
    title: "Gym",
    dueDate: "2026-10-16",
    recurrence: rule,
    seriesId: "44444444-4444-4444-4444-444444444444",
    seriesTemplate: { title: "Gym", description: "", priority: "low", tags: [] },
  };

  it("round-trips recurrence, series, and template exactly (SC-007)", () => {
    const result = parseImport(serializeExport([recurring, full, minimal]));
    expect(result).toEqual({ ok: true, tasks: [recurring, full, minimal] });
  });

  it("imports files exported before recurrence existed", () => {
    expect(parseImport(doc({ tasks: [full, minimal] }))).toEqual({ ok: true, tasks: [full, minimal] });
  });

  it("imports a task with an unreadable rule as an ordinary task, keeping everything else", () => {
    const result = parseImport(
      doc({ tasks: [full, { ...minimal, recurrence: { kind: "yearly" }, seriesId: "s1" }] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tasks).toEqual([full, minimal]);
    expect(result.tasks[1]).not.toHaveProperty("recurrence");
    expect(result.tasks[1]).not.toHaveProperty("seriesId");
  });

  it("still rejects the whole file when a task is invalid in some other way", () => {
    const result = parseImport(doc({ tasks: [recurring, { ...minimal, priority: "x" }] }));
    expect(result.ok).toBe(false);
  });

  it("exports the new fields in the file", () => {
    const parsed = JSON.parse(serializeExport([recurring]));
    expect(parsed.tasks[0]).toMatchObject({ recurrence: rule, seriesId: recurring.seriesId });
  });
});

describe("export and import with subtasks", () => {
  const steps = [
    { id: "s2", title: "Second", priority: "high", dueDate: "2026-12-02", done: true },
    { id: "s1", title: "First", priority: "low", dueDate: null, done: false },
  ];
  const withSteps = { ...full, id: "33333333-3333-3333-3333-333333333333", subtasks: steps } as Task;

  it("round-trips subtasks, their fields, and their order exactly (SC-005)", () => {
    const result = parseImport(serializeExport([withSteps, minimal]));
    expect(result).toEqual({ ok: true, tasks: [withSteps, minimal] });
    expect(result.ok && result.tasks[0]?.subtasks?.map((s) => s.id)).toEqual(["s2", "s1"]);
  });

  it("imports files exported before subtasks existed", () => {
    expect(parseImport(doc({ tasks: [full, minimal] }))).toEqual({ ok: true, tasks: [full, minimal] });
  });

  it("imports a task with unreadable subtasks without them, keeping everything else", () => {
    const result = parseImport(doc({ tasks: [full, { ...minimal, subtasks: [{ id: "a", title: " " }] }] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tasks).toEqual([full, minimal]);
    expect(result.tasks[1]).not.toHaveProperty("subtasks");
  });

  it("still rejects the whole file when a task is invalid in some other way", () => {
    expect(parseImport(doc({ tasks: [withSteps, { ...minimal, priority: "x" }] })).ok).toBe(false);
  });

  it("writes the subtasks into the file", () => {
    const parsed = JSON.parse(serializeExport([withSteps]));
    expect(parsed.tasks[0].subtasks).toEqual(steps);
  });
});
