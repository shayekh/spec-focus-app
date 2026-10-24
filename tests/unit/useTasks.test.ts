import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { tasksReducer, useTasks } from "../../src/state/useTasks";
import { loadTasks } from "../../src/storage/taskStore";
import { createTask, type Task } from "../../src/domain/task";

function make(title: string, id: string): Task {
  const result = createTask({ title }, new Date("2026-10-25T10:00:00.000Z"), id);
  if (!result.ok) throw new Error("fixture");
  return result.task;
}

const a = make("A", "a");
const b = make("B", "b");

describe("tasksReducer", () => {
  it("adds a task at the front", () => {
    expect(tasksReducer([a], { type: "add", task: b })).toEqual([b, a]);
  });

  it("updates only the targeted task", () => {
    const changed = { ...a, title: "A2" };
    expect(tasksReducer([a, b], { type: "update", task: changed })).toEqual([changed, b]);
  });

  it("deletes only the targeted task", () => {
    expect(tasksReducer([a, b], { type: "delete", id: "a" })).toEqual([b]);
  });

  it("replaces the whole list", () => {
    expect(tasksReducer([a], { type: "replaceAll", tasks: [b] })).toEqual([b]);
  });
});

describe("useTasks", () => {
  it("starts from stored tasks", () => {
    const { result: first } = renderHook(() => useTasks());
    act(() => first.current.dispatch({ type: "add", task: a }));
    const { result: second } = renderHook(() => useTasks());
    expect(second.current.tasks).toEqual([a]);
  });

  it("persists every change", () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.dispatch({ type: "add", task: a }));
    act(() => result.current.dispatch({ type: "add", task: b }));
    act(() => result.current.dispatch({ type: "delete", id: "a" }));
    expect(loadTasks().tasks).toEqual([b]);
    expect(result.current.tasks).toEqual([b]);
  });

  it("reloads from storage without writing", () => {
    const { result } = renderHook(() => useTasks());
    localStorage.setItem("focus-app:tasks", JSON.stringify({ version: 1, tasks: [a] }));
    act(() => result.current.reloadFromStorage());
    expect(result.current.tasks).toEqual([a]);
  });

  it("reports a failed save through the notice", () => {
    const { result } = renderHook(() => useTasks());
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    try {
      act(() => result.current.dispatch({ type: "add", task: a }));
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(result.current.notice).toMatch(/could not be saved/i);
    expect(result.current.tasks).toEqual([a]);
  });
});
