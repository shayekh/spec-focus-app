import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { subscribeToTaskChanges } from "../../src/storage/crossTab";
import { TASKS_KEY } from "../../src/storage/taskStore";
import { useTasks } from "../../src/state/useTasks";
import { createTask } from "../../src/domain/task";

function fire(key: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

describe("subscribeToTaskChanges", () => {
  it("calls back when the tasks key changes", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToTaskChanges(onChange);
    fire(TASKS_KEY);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("calls back when storage is cleared (null key)", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToTaskChanges(onChange);
    fire(null);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("ignores unrelated keys", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToTaskChanges(onChange);
    fire("focus-app:theme");
    fire("something-else");
    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("stops calling back after unsubscribe", () => {
    const onChange = vi.fn();
    subscribeToTaskChanges(onChange)();
    fire(TASKS_KEY);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("useTasks cross-tab sync", () => {
  it("reloads tasks when another tab changes storage", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([]);

    const created = createTask({ title: "From another tab" });
    if (!created.ok) throw new Error("fixture");
    localStorage.setItem(
      TASKS_KEY,
      JSON.stringify({ version: 1, tasks: [created.task] }),
    );
    act(() => fire(TASKS_KEY));

    expect(result.current.tasks).toEqual([created.task]);
  });
});
