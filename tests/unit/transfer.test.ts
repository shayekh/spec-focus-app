import { describe, expect, it } from "vitest";
import { exportFilename, parseImport, serializeExport } from "../../src/domain/transfer";
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
