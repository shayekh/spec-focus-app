import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TaskList } from "../../src/ui/TaskList";
import type { Task } from "../../src/domain/task";

function task(overrides: Partial<Task>): Task {
  return {
    id: "1",
    title: "Write report",
    description: "Quarterly numbers",
    priority: "high",
    status: "in-progress",
    dueDate: "2026-11-01",
    tags: ["work", "writing"],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

const noop = () => {};
const handlers = { onEdit: noop, onComplete: noop, onDelete: noop, onClearFilters: noop };

describe("TaskList", () => {
  it("renders title, priority, status, due date, and tags for each task", () => {
    render(<TaskList tasks={[task({})]} hasTasks today="2026-10-25" {...handlers} />);

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("Write report")).toBeInTheDocument();
    expect(within(item).getByText(/priority: high/i)).toBeInTheDocument();
    expect(within(item).getByText(/status: in-progress/i)).toBeInTheDocument();
    expect(within(item).getByText(/due 2026-11-01/i)).toBeInTheDocument();
    expect(within(item).getByText("work")).toBeInTheDocument();
    expect(within(item).getByText("writing")).toBeInTheDocument();
  });

  it("shows an empty state inviting the user to create a task when there are none", () => {
    render(<TaskList tasks={[]} hasTasks={false} today="2026-10-25" {...handlers} />);
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("marks overdue tasks", () => {
    render(
      <TaskList
        tasks={[task({ dueDate: "2026-10-01" })]}
        hasTasks
        today="2026-10-25"
        {...handlers}
      />,
    );
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it("does not mark completed tasks as overdue and styles them as completed", () => {
    render(
      <TaskList
        tasks={[task({ dueDate: "2026-10-01", status: "completed" })]}
        hasTasks
        today="2026-10-25"
        {...handlers}
      />,
    );
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveClass("is-completed");
  });
});
