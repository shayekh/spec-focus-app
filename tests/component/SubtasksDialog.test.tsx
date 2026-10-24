import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubtasksDialog } from "../../src/ui/SubtasksDialog";
import type { Subtask } from "../../src/domain/subtasks";
import type { Task } from "../../src/domain/task";

const TODAY = "2026-10-15";

function sub(id: string, overrides: Partial<Subtask> = {}): Subtask {
  return { id, title: `Step ${id}`, priority: "medium", dueDate: null, done: false, ...overrides };
}

function parent(subtasks?: Subtask[], overrides: Partial<Task> = {}): Task {
  const base: Task = {
    id: "t1",
    title: "Plan launch",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    tags: ["work", "q4"],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
  return subtasks ? { ...base, subtasks } : base;
}

interface HarnessProps {
  initial?: Task;
  onChange?: (task: Task) => void;
  onOffer?: (task: Task) => void;
  onClose?: () => void;
}

/** Holds the task like the app does: every change replaces it. */
function Harness({ initial = parent(), onChange = () => {}, onOffer = () => {}, onClose = () => {} }: HarnessProps) {
  const [task, setTask] = useState(initial);
  return (
    <SubtasksDialog
      task={task}
      today={TODAY}
      onChange={(next) => {
        setTask(next);
        onChange(next);
      }}
      onOffer={onOffer}
      onClose={onClose}
    />
  );
}

const field = () => screen.getByLabelText("New subtask");
const rows = () => within(screen.getByRole("list", { name: "Subtasks" })).getAllByRole("listitem");
const rowTitles = () => rows().map((row) => row.querySelector(".subtask-title")?.textContent);
const status = () => screen.getByRole("status", { name: "Subtasks announcements" });

describe("SubtasksDialog adding subtasks", () => {
  it("is a dialog named for the task, with a Close button", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Subtasks: Plan launch" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says there are none yet, and has no list", () => {
    render(<Harness />);
    expect(screen.getByText("No subtasks yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Subtasks" })).not.toBeInTheDocument();
  });

  it("adds a subtask with Enter at the end of the list, clears the field, and keeps focus there", async () => {
    const onChange = vi.fn();
    render(<Harness initial={parent([sub("a")])} onChange={onChange} />);
    await userEvent.type(field(), "Write the post{Enter}");

    expect(rowTitles()).toEqual(["Step a", "Write the post"]);
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();
    const saved: Task = onChange.mock.calls[0]?.[0];
    expect(saved.subtasks?.[1]).toMatchObject({ title: "Write the post", priority: "medium", dueDate: null, done: false });
  });

  it("adds with the Add subtask button", async () => {
    render(<Harness />);
    await userEvent.type(field(), "First");
    await userEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    expect(rowTitles()).toEqual(["First"]);
  });

  it("lets several be added in a row without touching the pointer", async () => {
    render(<Harness />);
    await userEvent.type(field(), "One{Enter}Two{Enter}Three{Enter}");
    expect(rowTitles()).toEqual(["One", "Two", "Three"]);
  });

  it("announces the addition with the progress", async () => {
    render(<Harness />);
    await userEvent.type(field(), "One{Enter}");
    expect(status()).toHaveTextContent('Added "One". 0 of 1 subtask complete');
  });

  it("shows the progress line", async () => {
    render(<Harness initial={parent([sub("a", { done: true }), sub("b")])} />);
    expect(screen.getByText("1 of 2 subtasks complete")).toBeInTheDocument();
  });

  it("refuses a blank title, says why under the field, and clears the message when typing", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(field(), "   {Enter}");
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.type(field(), "x");
    expect(screen.queryByText("Title is required.")).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("refuses a 51st subtask and says that 50 is the limit", async () => {
    const fifty = Array.from({ length: 50 }, (_, i) => sub(`s${i}`));
    const onChange = vi.fn();
    render(<Harness initial={parent(fifty)} onChange={onChange} />);
    await userEvent.type(field(), "One too many{Enter}");
    expect(screen.getByText("A task can have up to 50 subtasks.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(50);
  });

  it("starts with focus in the add field", () => {
    render(<Harness />);
    expect(field()).toHaveFocus();
  });
});

describe("SubtasksDialog completing (US2)", () => {
  it("ticks and unticks, updating the progress line and the announcement", async () => {
    const onChange = vi.fn();
    render(<Harness initial={parent([sub("a"), sub("b")])} onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Step a" }));
    expect(onChange.mock.calls[0]?.[0].subtasks[0].done).toBe(true);
    expect(screen.getByText("1 of 2 subtasks complete")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Step a marked complete. 1 of 2 subtasks complete");

    await userEvent.click(screen.getByRole("checkbox", { name: "Step a" }));
    expect(status()).toHaveTextContent("Step a marked not complete. 0 of 2 subtasks complete");
  });

  it("offers to complete the task only when the last subtask of an open task is completed", async () => {
    const onOffer = vi.fn();
    render(<Harness initial={parent([sub("a"), sub("b")])} onOffer={onOffer} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Step a" }));
    expect(onOffer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Step b" }));
    expect(onOffer).toHaveBeenCalledTimes(1);
    expect(onOffer.mock.calls[0]?.[0].status).toBe("todo");

    await userEvent.click(screen.getByRole("checkbox", { name: "Step b" })); // untick
    expect(onOffer).toHaveBeenCalledTimes(1);
  });

  it("does not offer for a completed task", async () => {
    const onOffer = vi.fn();
    render(<Harness initial={parent([sub("a")], { status: "completed" })} onOffer={onOffer} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Step a" }));
    expect(onOffer).not.toHaveBeenCalled();
  });
});

describe("SubtasksDialog details, edit, delete, and move (US4)", () => {
  const edit = (title: string) => userEvent.click(screen.getByRole("button", { name: `Edit ${title}` }));
  const noop = () => {};

  it("shows priority, due date, overdue in words, and the parent tags", () => {
    render(
      <Harness
        initial={parent([sub("a", { priority: "high", dueDate: "2026-10-10" }), sub("b", { dueDate: "2026-10-10", done: true })])}
      />,
    );
    const [first, second] = rows();
    expect(within(first as HTMLElement).getByText("Priority: high")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("Due 2026-10-10")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("Overdue")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("work")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("q4")).toBeInTheDocument();
    expect(within(second as HTMLElement).queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("follows a change of the parent tags", () => {
    const view = render(<SubtasksDialog task={parent([sub("a")])} today={TODAY} onChange={noop} onOffer={noop} onClose={noop} />);
    expect(screen.getByText("work")).toBeInTheDocument();
    view.rerender(
      <SubtasksDialog task={parent([sub("a")], { tags: ["home"] })} today={TODAY} onChange={noop} onOffer={noop} onClose={noop} />,
    );
    expect(screen.queryByText("work")).not.toBeInTheDocument();
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("edits title, priority, and due date, then returns focus to the Edit button", async () => {
    const onChange = vi.fn();
    render(<Harness initial={parent([sub("a")])} onChange={onChange} />);
    await edit("Step a");
    expect(screen.getByLabelText("Subtask title")).toHaveFocus();
    await userEvent.clear(screen.getByLabelText("Subtask title"));
    await userEvent.type(screen.getByLabelText("Subtask title"), "Renamed");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "high");
    await userEvent.type(screen.getByLabelText("Due date (optional)"), "2026-10-30");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange.mock.calls[0]?.[0].subtasks[0]).toMatchObject({ title: "Renamed", priority: "high", dueDate: "2026-10-30" });
    expect(screen.getByText("Due 2026-10-30")).toBeInTheDocument();
    expect(status()).toHaveTextContent('Saved "Renamed".');
    expect(screen.getByRole("button", { name: "Edit Renamed" })).toHaveFocus();
  });

  it("keeps the fields open with a message for a blank title", async () => {
    const onChange = vi.fn();
    render(<Harness initial={parent([sub("a")])} onChange={onChange} />);
    await edit("Step a");
    await userEvent.clear(screen.getByLabelText("Subtask title"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Subtask title")).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels with Cancel or Escape without closing the dialog", async () => {
    const onClose = vi.fn();
    const onChange = vi.fn();
    render(<Harness initial={parent([sub("a")])} onClose={onClose} onChange={onChange} />);
    await edit("Step a");
    await userEvent.type(screen.getByLabelText("Subtask title"), " more");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Step a")).toBeInTheDocument();

    await edit("Step a");
    await userEvent.type(screen.getByLabelText("Subtask title"), " more");
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit Step a" })).toHaveFocus();
  });

  it("deletes at once, announces it, moves focus to the add field, and never offers completion", async () => {
    const onOffer = vi.fn();
    render(<Harness initial={parent([sub("a", { done: true }), sub("b")])} onOffer={onOffer} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Step b" }));
    expect(rowTitles()).toEqual(["Step a"]);
    expect(status()).toHaveTextContent('Deleted "Step b". 1 of 1 subtask complete');
    expect(field()).toHaveFocus();
    expect(onOffer).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete Step a" }));
    expect(screen.getByText("No subtasks yet.")).toBeInTheDocument();
    expect(status()).toHaveTextContent('Deleted "Step a".');
  });

  it("moves up and down, with no Up on the first row and no Down on the last", async () => {
    render(<Harness initial={parent([sub("a"), sub("b"), sub("c")])} />);
    expect(screen.queryByRole("button", { name: "Move Step a up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move Step c down" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Move Step c up" }));
    expect(rowTitles()).toEqual(["Step a", "Step c", "Step b"]);
    expect(status()).toHaveTextContent("Step c moved to position 2 of 3");
    expect(screen.getByRole("button", { name: "Move Step c up" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Move Step c up" }));
    expect(rowTitles()).toEqual(["Step c", "Step a", "Step b"]);
    // At the top there is no Up any more: focus goes to the other direction.
    expect(screen.getByRole("button", { name: "Move Step c down" })).toHaveFocus();
  });

  it("does not offer to complete after an edit or a move", async () => {
    const onOffer = vi.fn();
    render(<Harness initial={parent([sub("a", { done: true }), sub("b", { done: true })])} onOffer={onOffer} />);
    await userEvent.click(screen.getByRole("button", { name: "Move Step b up" }));
    await edit("Step a");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onOffer).not.toHaveBeenCalled();
  });
});
