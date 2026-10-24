import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskForm } from "../../src/ui/TaskForm";

describe("TaskForm", () => {
  it("shows an inline error linked to the title and does not submit when the title is empty", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    const title = screen.getByLabelText(/title/i);
    const error = screen.getByText(/title is required/i);
    expect(onSave).not.toHaveBeenCalled();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("submits the entered values", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText(/title/i), "Write spec");
    await userEvent.type(screen.getByLabelText(/description/i), "Draft v1");
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), "high");
    await userEvent.selectOptions(screen.getByLabelText(/status/i), "in-progress");
    await userEvent.type(screen.getByLabelText(/due date/i), "2026-12-01");
    await userEvent.type(screen.getByLabelText(/tags/i), "work, writing");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith({
      title: "Write spec",
      description: "Draft v1",
      priority: "high",
      status: "in-progress",
      dueDate: "2026-12-01",
      tags: ["work", "writing"],
    });
  });

  it("defaults to medium priority and todo status", () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText(/priority/i)).toHaveValue("medium");
    expect(screen.getByLabelText(/status/i)).toHaveValue("todo");
  });

  it("closes on Escape and on Cancel without saving", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={onCancel} />);

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });
});
