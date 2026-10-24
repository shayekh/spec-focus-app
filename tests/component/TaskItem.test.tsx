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
  const handlers = { onEdit: vi.fn(), onComplete: vi.fn(), onDelete: vi.fn() };
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
