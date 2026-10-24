import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/ui/App";
import { TASKS_KEY } from "../../src/storage/taskStore";

const stamp = "2026-10-01T00:00:00.000Z";

function task(id: string, title: string, dueDate: string | null, tags: string[], status = "todo") {
  return {
    id,
    title,
    description: "",
    priority: "medium",
    status,
    dueDate,
    tags,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function seed() {
  localStorage.setItem(
    TASKS_KEY,
    JSON.stringify({
      version: 1,
      tasks: [
        task("a", "Alpha", "2026-10-15", ["work"]),
        task("b", "Beta", "2026-10-20", ["home"], "in-progress"),
        task("c", "Gamma", null, ["work"]),
      ],
    }),
  );
}

beforeEach(() => {
  // Only the clock is faked, so user-event timers keep working. 15 October 2026 is a Thursday.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0));
  seed();
});

afterEach(() => {
  vi.useRealTimers();
});

const calendar = () => screen.getByRole("region", { name: "Calendar" });

describe("switching between the list and the calendar", () => {
  it("shows the list by default, and the calendar replaces it when chosen", async () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(within(calendar()).getByRole("button", { name: /^Alpha/ })).toBeInTheDocument();
    expect(within(calendar()).getByRole("button", { name: /^Beta/ })).toBeInTheDocument();
    expect(within(calendar()).queryByText("Gamma")).not.toBeInTheDocument();
  });

  it("brings the list back unchanged", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await userEvent.click(screen.getByRole("button", { name: "List" }));

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles.sort()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps the filter bar visible in both views", async () => {
    render(<App />);
    expect(screen.getByRole("combobox", { name: "Tag" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("combobox", { name: "Tag" })).toBeInTheDocument();
  });

  it("keeps the month the user was looking at while switching away and back", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "List" }));
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
  });
});

describe("filters apply to the calendar as they apply to the list", () => {
  it("shows only the matching tasks in both views", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tag" }), "home");

    expect(within(calendar()).getByRole("button", { name: /^Beta/ })).toBeInTheDocument();
    expect(within(calendar()).queryByRole("button", { name: /^Alpha/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Beta"]);
  });

  it("applies the search box to the calendar", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search" }), "alp");

    expect(within(calendar()).getByRole("button", { name: /^Alpha/ })).toBeInTheDocument();
    expect(within(calendar()).queryByRole("button", { name: /^Beta/ })).not.toBeInTheDocument();
  });

  it("explains an empty period caused by filters and clears them from the calendar", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "completed");

    expect(within(calendar()).getByText("No tasks match your filters in this period.")).toBeInTheDocument();

    await userEvent.click(within(calendar()).getByRole("button", { name: "Clear filters" }));

    expect(within(calendar()).getByRole("button", { name: /^Alpha/ })).toBeInTheDocument();
    expect(within(calendar()).getByRole("button", { name: /^Beta/ })).toBeInTheDocument();
  });
});

describe("opening a task from the calendar", () => {
  const cellFor = (date: string): HTMLElement => {
    const td = document.querySelector(`time[datetime="${date}"]`)?.closest("td");
    if (!td) throw new Error(`no cell for ${date}`);
    return td;
  };

  it("opens the task form modal with every field filled in", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await userEvent.click(within(calendar()).getByRole("button", { name: /^Beta/ }));

    const dialog = screen.getByRole("dialog", { name: "Edit task" });
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Beta");
    expect(within(dialog).getByLabelText("Status")).toHaveValue("in-progress");
    expect(within(dialog).getByLabelText("Due date")).toHaveValue("2026-10-20");
    expect(within(dialog).getByLabelText(/Tags/)).toHaveValue("home");
  });

  it("opens from the keyboard with Enter", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    within(calendar()).getByRole("button", { name: /^Alpha/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Alpha");
  });

  it("moves the task to its new date when the due date is changed and saved", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await userEvent.click(within(calendar()).getByRole("button", { name: /^Beta/ }));

    const due = screen.getByLabelText("Due date");
    await userEvent.clear(due);
    await userEvent.type(due, "2026-10-22");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(cellFor("2026-10-22")).getByRole("button", { name: /^Beta/ })).toBeInTheDocument();
    expect(within(cellFor("2026-10-20")).queryByRole("button", { name: /^Beta/ })).not.toBeInTheDocument();
  });

  it("returns focus to the task when the dialog is closed without changes", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    const entry = within(calendar()).getByRole("button", { name: /^Alpha/ });
    await userEvent.click(entry);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(calendar()).getByRole("button", { name: /^Alpha/ })).toHaveFocus();
  });
});
