import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "../../src/ui/TaskItem";
import type { Task } from "../../src/domain/task";

const task: Task = {
  id: "1",
  title: "Write report",
  description: "",
  priority: "medium",
  status: "todo",
  dueDate: null,
  tags: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function setup(overrides: Partial<Task> = {}) {
  const handlers = { onEdit: vi.fn(), onComplete: vi.fn(), onDelete: vi.fn(), onSubtasks: vi.fn() };
  const item = { ...task, ...overrides };
  render(
    <ul>
      <TaskItem task={item} today="2026-10-25" {...handlers} />
    </ul>,
  );
  return { handlers, item };
}

describe("TaskItem actions", () => {
  it("calls onComplete from the Complete button", async () => {
    const { handlers, item } = setup();
    await userEvent.click(screen.getByRole("button", { name: /complete write report/i }));
    expect(handlers.onComplete).toHaveBeenCalledWith(item);
  });

  it("hides the Complete button for completed tasks", () => {
    setup({ status: "completed" });
    expect(screen.queryByRole("button", { name: /complete/i })).not.toBeInTheDocument();
  });

  it("calls onEdit and onDelete", async () => {
    const { handlers, item } = setup();
    await userEvent.click(screen.getByRole("button", { name: /edit write report/i }));
    await userEvent.click(screen.getByRole("button", { name: /delete write report/i }));
    expect(handlers.onEdit).toHaveBeenCalledWith(item);
    expect(handlers.onDelete).toHaveBeenCalledWith(item);
  });

  it("marks the priority badge with a per-priority class and keeps the text", () => {
    for (const priority of ["low", "medium", "high"] as const) {
      const { unmount } = render(
        <ul>
          <TaskItem
            task={{ ...task, priority }}
            today="2026-10-25"
            onEdit={() => {}}
            onComplete={() => {}}
            onDelete={() => {}}
            onSubtasks={() => {}}
          />
        </ul>,
      );
      const badge = screen.getByText(`Priority: ${priority}`);
      expect(badge).toHaveClass("priority", `priority-${priority}`);
      unmount();
    }
  });

  it("uses an outlined Delete button in the list", () => {
    setup();
    const button = screen.getByRole("button", { name: /delete write report/i });
    expect(button).toHaveClass("danger-outline");
    expect(button).not.toHaveClass("danger");
  });
});

describe("TaskItem repeat label (v4)", () => {
  const rule = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: "2026-12-31" } as const;

  it("shows the rule description as a badge on a recurring task", () => {
    setup({ dueDate: "2026-10-15", recurrence: { ...rule, weekdays: [3] }, seriesId: "s1" });
    const badge = screen.getByText("Repeats weekly on Thursday until Dec 31, 2026");
    expect(badge).toHaveClass("badge", "repeat");
  });

  it("hides the repeat symbol from assistive technology", () => {
    setup({ dueDate: "2026-10-15", recurrence: { ...rule, weekdays: [3] }, seriesId: "s1" });
    const symbol = screen.getByText("Repeats weekly on Thursday until Dec 31, 2026").querySelector("svg");
    expect(symbol).not.toBeNull();
    expect(symbol).toHaveAttribute("aria-hidden", "true");
  });

  it("shows no repeat badge on an ordinary task", () => {
    setup();
    expect(screen.queryByText(/^Repeats/)).not.toBeInTheDocument();
  });

  it("shows the label on a completed occurrence of a live series too", () => {
    setup({ status: "completed", dueDate: "2026-10-08", recurrence: { ...rule, weekdays: [3] }, seriesId: "s1" });
    expect(screen.getByText(/^Repeats weekly on Thursday/)).toBeInTheDocument();
  });
});

describe("TaskItem subtasks (v5)", () => {
  const steps = [
    { id: "a", title: "One", priority: "medium", dueDate: null, done: true },
    { id: "b", title: "Two", priority: "medium", dueDate: null, done: false },
    { id: "c", title: "Three", priority: "medium", dueDate: null, done: false },
    { id: "d", title: "Four", priority: "medium", dueDate: null, done: false },
  ] as const;

  it("shows progress text and a bar with the matching width", () => {
    setup({ subtasks: [...steps] });
    expect(screen.getByText("1 of 4 subtasks complete")).toBeInTheDocument();
    const bar = document.querySelector(".progress-bar");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar?.firstElementChild).toHaveStyle({ width: "25%" });
  });

  it("shows no progress for a task without subtasks", () => {
    setup();
    expect(screen.queryByText(/subtasks? complete/)).not.toBeInTheDocument();
    expect(document.querySelector(".progress-bar")).toBeNull();
  });

  it("has a Subtasks button that calls onSubtasks", async () => {
    const { handlers, item } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Subtasks for Write report" }));
    expect(handlers.onSubtasks).toHaveBeenCalledWith(item);
  });
});
