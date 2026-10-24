import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/ui/App";
import { TASKS_KEY, loadTasks } from "../../src/storage/taskStore";
import type { Recurrence } from "../../src/domain/recurrence";
import type { Task } from "../../src/domain/task";

const stamp = "2026-10-01T00:00:00.000Z";

const weekly = (endDate: string | null = null): Recurrence => ({
  kind: "weekly",
  weekdays: [3],
  dayOfMonth: null,
  endDate,
});
const daily: Recurrence = { kind: "daily", weekdays: [], dayOfMonth: null, endDate: null };

function task(id: string, title: string, dueDate: string | null, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title,
    description: "",
    priority: "medium",
    status: "todo",
    dueDate,
    tags: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

/** A task in series `s1`; the series own details are its details unless a template is given. */
function occ(id: string, due: string, overrides: Partial<Task> = {}): Task {
  const made = task(id, "Water plants", due, { recurrence: weekly(), seriesId: "s1", ...overrides });
  return {
    ...made,
    seriesTemplate: overrides.seriesTemplate ?? {
      title: made.title,
      description: made.description,
      priority: made.priority,
      tags: made.tags,
    },
  };
}

function seed(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks }));
}

beforeEach(() => {
  // Only the clock is faked, so user-event timers keep working. 15 October 2026 is a Thursday.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const items = () => screen.getAllByRole("listitem");
const itemsFor = (title: string) => items().filter((el) => within(el).queryByRole("heading", { name: title }));
const badgeTexts = (el: HTMLElement) => Array.from(el.querySelectorAll(".badge")).map((b) => b.textContent?.trim());

describe("completing a recurring task creates the next occurrence", () => {
  it("completes the task and adds the next one with the next date, status todo", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));

    const rows = itemsFor("Water plants");
    expect(rows).toHaveLength(2);
    const texts = rows.map(badgeTexts);
    expect(texts.some((t) => t.includes("Status: completed") && t.includes("Due 2026-10-15"))).toBe(true);
    expect(texts.some((t) => t.includes("Status: todo") && t.includes("Due 2026-10-22"))).toBe(true);
    // The new occurrence is the one at the top.
    expect(badgeTexts(rows[0] as HTMLElement)).toContain("Due 2026-10-22");
  });

  it("announces the next date", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));
    expect(
      screen.getByText('Completed "Water plants". Next one is due Thursday, October 22, 2026.'),
    ).toBeInTheDocument();
  });

  it("keeps the repeat label on both the completed and the new occurrence of a live series", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));
    for (const row of itemsFor("Water plants")) {
      expect(badgeTexts(row)).toContain("Repeats weekly on Thursday");
    }
  });

  it("works from the scheduled due date, so a late completion gives an overdue next occurrence", async () => {
    seed([occ("a", "2026-10-01", { recurrence: daily })]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));
    const next = itemsFor("Water plants").find((row) => badgeTexts(row).includes("Status: todo"));
    expect(next && badgeTexts(next)).toContain("Due 2026-10-02");
    expect(next && badgeTexts(next)).toContain("Overdue");
  });

  it("follows a monthly rule through the end of February", async () => {
    const monthly: Recurrence = { kind: "monthly", weekdays: [], dayOfMonth: 31, endDate: null };
    seed([occ("a", "2026-01-31", { recurrence: monthly })]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));
    const open = itemsFor("Water plants").find((row) => badgeTexts(row).includes("Status: todo"));
    expect(open && badgeTexts(open)).toContain("Due 2026-02-28");
  });

  it("moves from a Friday to the next chosen weekday", async () => {
    const days: Recurrence = { kind: "days", weekdays: [0, 2, 4], dayOfMonth: null, endDate: null };
    seed([occ("a", "2026-10-16", { recurrence: days })]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));
    const open = itemsFor("Water plants").find((row) => badgeTexts(row).includes("Status: todo"));
    expect(open && badgeTexts(open)).toContain("Due 2026-10-19");
  });

  it("creates the next occurrence once when status is set to completed in the form", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Water plants" }));
    await userEvent.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Status"), "completed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(itemsFor("Water plants")).toHaveLength(2);
    expect(loadTasks().tasks.filter((t) => t.status === "todo")).toHaveLength(1);
    expect(loadTasks().tasks.find((t) => t.status === "todo")?.dueDate).toBe("2026-10-22");
  });

  it("does not change any other task, or earlier completed occurrences", async () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    const other = task("other", "Unrelated", "2026-10-16");
    seed([occ("a", "2026-10-15"), history, other]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));

    const stored = loadTasks().tasks;
    expect(stored.find((t) => t.id === "old")).toEqual(history);
    expect(stored.find((t) => t.id === "other")).toEqual(other);
    expect(stored.filter((t) => t.seriesId === "s1" && t.status !== "completed")).toHaveLength(1);
  });
});

describe("the end of a series", () => {
  it("creates nothing when the next date would be after the end date, and says so", async () => {
    seed([occ("a", "2026-10-15", { recurrence: weekly("2026-10-20") })]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));

    expect(itemsFor("Water plants")).toHaveLength(1);
    expect(screen.getByText('Completed "Water plants". That was the last occurrence.')).toBeInTheDocument();
  });

  it("leaves the last occurrence as an ordinary completed task with no repeat label", async () => {
    const history = occ("old", "2026-10-08", { status: "completed", recurrence: weekly("2026-10-20") });
    seed([occ("a", "2026-10-15", { recurrence: weekly("2026-10-20") }), history]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));

    for (const row of itemsFor("Water plants")) {
      expect(badgeTexts(row).some((b) => b?.startsWith("Repeats"))).toBe(false);
    }
    expect(loadTasks().tasks.every((t) => t.recurrence === undefined && t.seriesId === undefined)).toBe(true);
  });

  it("still creates the next one when the next date is exactly the end date", async () => {
    seed([occ("a", "2026-10-15", { recurrence: weekly("2026-10-22") })]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));
    expect(itemsFor("Water plants")).toHaveLength(2);
  });
});

describe("reopening a completed occurrence", () => {
  it("makes it an ordinary task when the series already has a newer open occurrence", async () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    seed([occ("a", "2026-10-15"), history]);
    render(<App />);

    const oldRow = itemsFor("Water plants").find((row) => badgeTexts(row).includes("Due 2026-10-08"));
    if (!oldRow) throw new Error("completed occurrence not found");
    await userEvent.click(within(oldRow).getByRole("button", { name: "Edit Water plants" }));
    await userEvent.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Status"), "todo");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const stored = loadTasks().tasks;
    const reopened = stored.find((t) => t.id === "old");
    expect(reopened).toMatchObject({ status: "todo" });
    expect(reopened).not.toHaveProperty("recurrence");
    expect(reopened).not.toHaveProperty("seriesId");
    expect(stored.filter((t) => t.seriesId === "s1" && t.status !== "completed")).toHaveLength(1);
  });
});

describe("making a plain task repeat from the form", () => {
  it("saves the rule and shows the label", async () => {
    seed([task("p", "Plain", "2026-10-15")]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Plain" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Repeat" }), "weekly");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const stored = loadTasks().tasks[0];
    expect(stored?.recurrence).toEqual(weekly());
    expect(typeof stored?.seriesId).toBe("string");
    expect(badgeTexts(itemsFor("Plain")[0] as HTMLElement)).toContain("Repeats weekly on Thursday");
  });

  it("creates a new recurring task from the New task form", async () => {
    seed([task("p", "Plain", "2026-10-15")]);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "New task" }));
    await userEvent.type(screen.getByLabelText(/^title/i), "Stretch");
    await userEvent.type(screen.getByLabelText("Due date"), "2026-10-16");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Repeat" }), "daily");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const created = loadTasks().tasks.find((t) => t.title === "Stretch");
    expect(created?.recurrence).toEqual(daily);
    expect(created?.seriesTemplate).toMatchObject({ title: "Stretch" });
  });
});

describe("editing one occurrence or the entire series", () => {
  const openEdit = async (title = "Water plants") =>
    userEvent.click(screen.getByRole("button", { name: `Edit ${title}` }));
  const save = () => userEvent.click(screen.getByRole("button", { name: "Save" }));

  it("changes this occurrence only and leaves the series details alone", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await openEdit();
    const title = screen.getByLabelText(/^title/i);
    await userEvent.clear(title);
    await userEvent.type(title, "Water ferns today");
    await save();

    const stored = loadTasks().tasks[0];
    expect(stored?.title).toBe("Water ferns today");
    expect(stored?.seriesTemplate?.title).toBe("Water plants");
  });

  it("gives the next occurrence the series details, not a one-off edit", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await openEdit();
    const title = screen.getByLabelText(/^title/i);
    await userEvent.clear(title);
    await userEvent.type(title, "Water ferns today");
    await save();
    await userEvent.click(screen.getByRole("button", { name: "Complete Water ferns today" }));

    const next = loadTasks().tasks.find((t) => t.status === "todo");
    expect(next?.title).toBe("Water plants");
  });

  it("changes the series, so later occurrences get the new details", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await openEdit();
    await userEvent.click(screen.getByRole("radio", { name: "Entire series" }));
    const title = screen.getByLabelText(/^title/i);
    await userEvent.clear(title);
    await userEvent.type(title, "Feed plants");
    await save();
    await userEvent.click(screen.getByRole("button", { name: "Complete Feed plants" }));

    const open = loadTasks().tasks.find((t) => t.status === "todo");
    expect(open?.title).toBe("Feed plants");
    expect(open?.dueDate).toBe("2026-10-22");
  });

  it("changes how the series repeats from the entire series scope", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await openEdit();
    await userEvent.click(screen.getByRole("radio", { name: "Entire series" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Repeat" }), "daily");
    await save();
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));

    expect(loadTasks().tasks.find((t) => t.status === "todo")?.dueDate).toBe("2026-10-16");
  });

  it("does not offer the choice for a task from a series with no open occurrence", async () => {
    seed([occ("old", "2026-10-08", { status: "completed" })]);
    render(<App />);
    await openEdit();
    expect(screen.queryByRole("group", { name: "Apply changes to" })).not.toBeInTheDocument();
  });
});

describe("stopping a series", () => {
  const openEdit = () => {
    const open = itemsFor("Water plants").find((row) => badgeTexts(row).includes("Status: todo"));
    if (!open) throw new Error("open occurrence not found");
    return userEvent.click(within(open).getByRole("button", { name: "Edit Water plants" }));
  };

  it("turns every occurrence into an ordinary task and keeps them", async () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    seed([occ("a", "2026-10-15"), history]);
    render(<App />);
    await openEdit();
    await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Stop repeating?" })).getByRole("button", { name: "Stop repeating" }),
    );

    const stored = loadTasks().tasks;
    expect(stored).toHaveLength(2);
    expect(stored.every((t) => t.recurrence === undefined && t.seriesId === undefined)).toBe(true);
    expect(stored.find((t) => t.id === "old")).toMatchObject({ status: "completed", dueDate: "2026-10-08" });
  });

  it("no longer creates a next occurrence when the task is completed", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await openEdit();
    await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Stop repeating?" })).getByRole("button", { name: "Stop repeating" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Complete Water plants" }));

    expect(loadTasks().tasks).toHaveLength(1);
  });

  it("changes nothing when the user keeps repeating", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await openEdit();
    await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep repeating" }));
    expect(loadTasks().tasks[0]?.recurrence).toEqual(weekly());
  });

  it("saves the rest of the form after stopping, as an ordinary task", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await openEdit();
    await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Stop repeating?" })).getByRole("button", { name: "Stop repeating" }),
    );
    const title = screen.getByLabelText(/^title/i);
    await userEvent.clear(title);
    await userEvent.type(title, "Water once");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const stored = loadTasks().tasks[0];
    expect(stored).toMatchObject({ title: "Water once" });
    expect(stored).not.toHaveProperty("recurrence");
    expect(stored).not.toHaveProperty("seriesId");
  });
});

describe("deleting a recurring task", () => {
  const askDelete = () => userEvent.click(screen.getByRole("button", { name: "Delete Water plants" }));

  it("warns that deleting the open occurrence ends the series", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await askDelete();
    expect(screen.getByText(/This task repeats\. Deleting it also ends the series\./)).toBeInTheDocument();
  });

  it("does not warn for a completed occurrence or an ordinary task", async () => {
    seed([occ("old", "2026-10-08", { status: "completed" }), task("p", "Plain", null)]);
    render(<App />);
    await askDelete();
    expect(screen.queryByText(/This task repeats/)).not.toBeInTheDocument();
  });

  it("ends the series and keeps the other occurrences as ordinary tasks", async () => {
    const history = occ("old", "2026-10-08", { status: "completed" });
    seed([occ("a", "2026-10-15"), history]);
    render(<App />);
    await userEvent.click(within(itemsFor("Water plants")[0] as HTMLElement).getByRole("button", { name: "Delete Water plants" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    const stored = loadTasks().tasks;
    expect(stored.map((t) => t.id)).toEqual(["old"]);
    expect(stored[0]).not.toHaveProperty("seriesId");
  });
});

describe("upcoming occurrences on the calendar", () => {
  const showCalendar = () => userEvent.click(screen.getByRole("button", { name: "Calendar" }));
  const previews = () => screen.queryAllByRole("button", { name: /upcoming/ });

  it("draws previews on the dates after the open occurrence, up to the end date", async () => {
    seed([occ("a", "2026-10-15", { recurrence: weekly("2026-10-28") })]);
    render(<App />);
    await showCalendar();
    // 22 October only: the 29th is after the end date.
    expect(previews()).toHaveLength(1);
  });

  it("starts after today when the open occurrence is overdue", async () => {
    seed([occ("a", "2026-10-01", { recurrence: weekly("2026-10-30") })]);
    render(<App />);
    await showCalendar();
    expect(previews()).toHaveLength(2); // 22 and 29 October
  });

  it("draws none for a series that has no open occurrence", async () => {
    seed([occ("a", "2026-10-08", { status: "completed" })]);
    render(<App />);
    await showCalendar();
    expect(previews()).toHaveLength(0);
  });

  it("hides them when a filter hides the open occurrence", async () => {
    seed([occ("a", "2026-10-15", { tags: ["home"] }), task("b", "Other", "2026-10-16", { tags: ["work"] })]);
    render(<App />);
    await showCalendar();
    expect(previews().length).toBeGreaterThan(0);
    await userEvent.selectOptions(screen.getByLabelText("Tag"), "work");
    expect(previews()).toHaveLength(0);
  });

  it("opens the open occurrence from a preview", async () => {
    seed([occ("a", "2026-10-15")]);
    render(<App />);
    await showCalendar();
    await userEvent.click(previews()[0] as HTMLElement);
    expect(within(screen.getByRole("dialog", { name: "Edit task" })).getByLabelText(/^title/i)).toHaveValue("Water plants");
  });
});
