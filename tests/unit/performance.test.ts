import { describe, expect, it } from "vitest";
import { DEFAULT_QUERY, applyQuery, deriveTags, type Query } from "../../src/domain/query";
import { PRIORITIES, STATUSES, type Task } from "../../src/domain/task";

function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => {
    const created = new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString();
    return {
      id: `id-${i}`,
      title: `Task number ${i} about topic ${i % 17}`,
      description: `Longer description for task ${i} with some searchable words like report${i % 11}`,
      priority: PRIORITIES[i % PRIORITIES.length] ?? "medium",
      status: STATUSES[i % STATUSES.length] ?? "todo",
      dueDate: i % 3 === 0 ? null : `2026-${String((i % 12) + 1).padStart(2, "0")}-15`,
      tags: [`tag${i % 20}`, `Group${i % 5}`],
      createdAt: created,
      updatedAt: created,
    };
  });
}

function time(fn: () => unknown): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe("query performance with 500 tasks (SC-003)", () => {
  const tasks = makeTasks(500);
  const run = (query: Partial<Query>) => time(() => applyQuery(tasks, { ...DEFAULT_QUERY, ...query }));

  it("filters in under 1 second", () => {
    expect(run({ status: "todo", priority: "high", tag: "tag3" })).toBeLessThan(1000);
  });

  it("searches in under 1 second", () => {
    expect(run({ search: "report7" })).toBeLessThan(1000);
  });

  it("sorts in under 1 second", () => {
    expect(run({ sort: "dueDate" })).toBeLessThan(1000);
    expect(run({ sort: "priority" })).toBeLessThan(1000);
  });

  it("derives tags in under 1 second", () => {
    expect(time(() => deriveTags(tasks))).toBeLessThan(1000);
  });

  it("returns the expected number of results", () => {
    expect(applyQuery(tasks, DEFAULT_QUERY)).toHaveLength(500);
    expect(applyQuery(tasks, { ...DEFAULT_QUERY, tag: "tag0" }).length).toBe(25);
  });
});
