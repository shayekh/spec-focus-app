import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/ui/App";
import { TASKS_KEY, loadTasks } from "../../src/storage/taskStore";
import type { Recurrence } from "../../src/domain/recurrence";
import type { Subtask } from "../../src/domain/subtasks";
import type { Task } from "../../src/domain/task";

const stamp = "2026-10-01T00:00:00.000Z";

function sub(id: string, overrides: Partial<Subtask> = {}): Subtask {
  return { id, title: `Step ${id}`, priority: "medium", dueDate: null, done: false, ...overrides };
}

function task(id: string, title: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title,
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    tags: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function seed(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const openSubtasks = (title = "Plan launch") =>
  userEvent.click(screen.getByRole("button", { name: `Subtasks for ${title}` }));
const dialog = () => screen.getByRole("dialog", { name: /^Subtasks:/ });
const stored = (id = "t1") => loadTasks().tasks.find((t) => t.id === id);

describe("opening and adding (US1)", () => {
  it("opens the dialog for the task, adds subtasks in order, and shows progress in the list", async () => {
    seed([task("t1", "Plan launch")]);
    render(<App />);
    await openSubtasks();
    await userEvent.type(within(dialog()).getByLabelText("New subtask"), "Draft{Enter}Review{Enter}Ship{Enter}");
    expect(stored()?.subtasks?.map((s) => s.title)).toEqual(["Draft", "Review", "Ship"]);

    await userEvent.click(within(dialog()).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("0 of 3 subtasks complete")).toBeInTheDocument();
  });

  it("returns focus to the Subtasks button on close", async () => {
    seed([task("t1", "Plan launch")]);
    render(<App />);
    await openSubtasks();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Subtasks for Plan launch" })).toHaveFocus();
  });

  it("closes the dialog when its task disappears in another tab", async () => {
    seed([task("t1", "Plan launch", { subtasks: [sub("a")] })]);
    render(<App />);
    await openSubtasks();
    seed([]);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: TASKS_KEY }));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("completing subtasks and the prompt (US2)", () => {
  const prompt = () => screen.getByRole("dialog", { name: "Complete task?" });

  it("asks, without completing, when the last subtask is ticked", async () => {
    seed([task("t1", "Plan launch", { subtasks: [sub("a", { done: true }), sub("b")] })]);
    render(<App />);
    await openSubtasks();
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step b" }));

    expect(within(prompt()).getByText('All subtasks of "Plan launch" are complete. Complete the task too?')).toBeInTheDocument();
    expect(within(prompt()).getByRole("button", { name: "Leave open" })).toHaveFocus();
    expect(stored()?.status).toBe("todo");
  });

  it("changes nothing on Leave open or Escape, and asks again only after the subtasks change", async () => {
    seed([task("t1", "Plan launch", { subtasks: [sub("a")] })]);
    render(<App />);
    await openSubtasks();
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step a" }));
    await userEvent.click(within(prompt()).getByRole("button", { name: "Leave open" }));
    expect(screen.queryByRole("dialog", { name: "Complete task?" })).not.toBeInTheDocument();
    expect(stored()?.status).toBe("todo");

    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step a" }));
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step a" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Complete task?" })).not.toBeInTheDocument();
    expect(stored()?.status).toBe("todo");
    expect(dialog()).toBeInTheDocument();
  });

  it("completes the task and its subtasks when agreed", async () => {
    seed([task("t1", "Plan launch", { subtasks: [sub("a"), sub("b", { done: true })] })]);
    render(<App />);
    await openSubtasks();
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step a" }));
    await userEvent.click(within(prompt()).getByRole("button", { name: "Complete task" }));

    expect(stored()?.status).toBe("completed");
    expect(stored()?.subtasks?.every((s) => s.done)).toBe(true);
    expect(dialog()).toBeInTheDocument();
  });

  it("completes a repeating task like the Complete button: the next occurrence is made", async () => {
    const weekly: Recurrence = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: null };
    seed([
      task("t1", "Plan launch", {
        dueDate: "2026-10-15",
        recurrence: weekly,
        seriesId: "s1",
        subtasks: [sub("a")],
      }),
    ]);
    render(<App />);
    await openSubtasks();
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step a" }));
    await userEvent.click(within(prompt()).getByRole("button", { name: "Complete task" }));

    const all = loadTasks().tasks;
    expect(all).toHaveLength(2);
    const next = all.find((t) => t.status === "todo");
    expect(next?.dueDate).toBe("2026-10-22");
    expect(next?.subtasks?.map((s) => s.done)).toEqual([false]);
  });

  it("does not ask for a completed task, when unticking, or after a delete", async () => {
    seed([
      task("t1", "Plan launch", { status: "completed", subtasks: [sub("a")] }),
      task("t2", "Other", { subtasks: [sub("x", { done: true }), sub("y")] }),
    ]);
    render(<App />);
    await openSubtasks();
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step a" }));
    expect(screen.queryByRole("dialog", { name: "Complete task?" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await openSubtasks("Other");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Delete Step y" }));
    expect(screen.queryByRole("dialog", { name: "Complete task?" })).not.toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step x" })); // untick
    expect(screen.queryByRole("dialog", { name: "Complete task?" })).not.toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "Step x" })); // tick again
    expect(screen.getByRole("dialog", { name: "Complete task?" })).toBeInTheDocument();
  });
});

describe("completing the parent (US3)", () => {
  it("the Complete button completes every subtask", async () => {
    seed([task("t1", "Plan launch", { subtasks: [sub("a", { done: true }), sub("b"), sub("c")] })]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Plan launch" }));
    expect(stored()?.subtasks?.every((s) => s.done)).toBe(true);
    expect(screen.getByText("3 of 3 subtasks complete")).toBeInTheDocument();
  });

  it("setting the status to completed in the form completes every subtask, and reopening leaves them", async () => {
    seed([task("t1", "Plan launch", { subtasks: [sub("a"), sub("b")] })]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Plan launch" }));
    await userEvent.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Status"), "completed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(stored()?.subtasks?.every((s) => s.done)).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Edit Plan launch" }));
    await userEvent.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Status"), "todo");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(stored()?.status).toBe("todo");
    expect(stored()?.subtasks?.every((s) => s.done)).toBe(true);
  });

  it("the delete confirmation says how many subtasks go too", async () => {
    seed([
      task("t1", "Plan launch", { subtasks: [sub("a"), sub("b")] }),
      task("t2", "Single", { subtasks: [sub("a")] }),
      task("t3", "Plain"),
    ]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Plan launch" }));
    expect(screen.getByText(/Its 2 subtasks will be deleted too\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "Delete Single" }));
    expect(screen.getByText(/Its 1 subtask will be deleted too\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "Delete Plain" }));
    expect(screen.queryByText(/subtasks? will be deleted too/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(stored("t3")).toBeUndefined();
  });
});
