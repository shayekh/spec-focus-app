import { describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/ui/App";
import { TASKS_KEY } from "../../src/storage/taskStore";

const stamp = "2026-10-01T00:00:00.000Z";

const full = {
  id: "t1",
  title: "Plan trip",
  description: "Flights and hotel",
  priority: "high",
  status: "in-progress",
  dueDate: "2026-12-01",
  tags: ["travel", "personal"],
  createdAt: stamp,
  updatedAt: stamp,
};

function seed(tasks: unknown[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks }));
}

/** What another browser tab would do: change storage and notify this tab. */
function changeStorageFromAnotherTab(tasks: unknown[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks }));
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: TASKS_KEY }));
  });
}

describe("edit in the shared modal", () => {
  it("opens a dialog titled Edit task with every field pre-filled", async () => {
    seed([full]);
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Plan trip" }));

    const dialog = screen.getByRole("dialog", { name: "Edit task" });
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Plan trip");
    expect(within(dialog).getByLabelText("Description")).toHaveValue("Flights and hotel");
    expect(within(dialog).getByLabelText("Priority")).toHaveValue("high");
    expect(within(dialog).getByLabelText("Status")).toHaveValue("in-progress");
    expect(within(dialog).getByLabelText("Due date")).toHaveValue("2026-12-01");
    expect(within(dialog).getByLabelText(/Tags/)).toHaveValue("travel, personal");
  });

  it("uses the same dialog for adding and editing", async () => {
    seed([full]);
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "New task" }));
    const controls = () => screen.getByRole("dialog").querySelectorAll("input, select, textarea").length;
    const addFields = controls();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByRole("button", { name: "Edit Plan trip" }));
    const editFields = controls();

    expect(addFields).toBe(7); // title, description, priority, status, due date, repeat, tags
    expect(editFields).toBe(addFields);
  });

  it("saves a change and shows it in the list", async () => {
    seed([full]);
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Plan trip" }));
    const title = screen.getByLabelText("Title");
    await userEvent.clear(title);
    await userEvent.type(title, "Plan holiday");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Plan holiday" })).toBeInTheDocument();
  });
});

describe("saving a task that no longer exists", () => {
  it("keeps the modal open with a message and does not recreate the task", async () => {
    seed([full]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Plan trip" }));
    await userEvent.type(screen.getByLabelText("Title"), " (edited)");

    changeStorageFromAnotherTab([]);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const dialog = screen.getByRole("dialog", { name: "Edit task" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "This task no longer exists, so your changes cannot be saved.",
    );
    // The text the user typed is still there so it can be copied.
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Plan trip (edited)");
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(TASKS_KEY) ?? "{}").tasks).toEqual([]);
  });

  it("clears the message when the modal is closed and reopened for another task", async () => {
    const other = { ...full, id: "t2", title: "Other task" };
    seed([full, other]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Plan trip" }));
    changeStorageFromAnotherTab([other]);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Other task" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
