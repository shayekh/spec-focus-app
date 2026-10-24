import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "../../src/ui/Calendar";
import type { CalendarState } from "../../src/domain/calendar";
import type { Task } from "../../src/domain/task";
import type { Preview } from "../../src/domain/series";

const TODAY = "2026-10-15"; // a Thursday

function task(id: string, title: string, dueDate: string | null, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title,
    description: "",
    priority: "medium",
    status: "todo",
    dueDate,
    tags: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

const tasks: Task[] = [
  task("1", "Plan review", TODAY, { priority: "high" }),
  task("2", "Later this month", "2026-10-20"),
  task("3", "Next month", "2026-11-03"),
  task("4", "Leading day", "2026-09-30"),
  task("5", "No date", null),
  task("6", "Finished", "2026-10-16", { status: "completed" }),
  task("7", "Overdue one", "2026-10-10"),
];

interface HarnessProps {
  tasks?: Task[];
  initial?: CalendarState;
  hiddenByFilters?: boolean;
  onOpen?: (task: Task) => void;
  onReschedule?: (taskId: string, date: string) => void;
  onClearFilters?: () => void;
  previews?: Preview[];
}

function Harness({
  tasks: list = tasks,
  initial = { view: "month", anchor: TODAY },
  hiddenByFilters = false,
  onOpen = () => {},
  onReschedule = () => {},
  onClearFilters = () => {},
  previews = [],
}: HarnessProps) {
  const [state, setState] = useState<CalendarState>(initial);
  return (
    <Calendar
      tasks={list}
      previews={previews}
      state={state}
      onStateChange={setState}
      today={TODAY}
      hiddenByFilters={hiddenByFilters}
      onOpen={onOpen}
      onReschedule={onReschedule}
      onClearFilters={onClearFilters}
    />
  );
}

function cell(date: string): HTMLElement {
  const time = document.querySelector(`time[datetime="${date}"]`);
  const td = time?.closest("td");
  if (!td) throw new Error(`no cell for ${date}`);
  return td;
}

describe("Calendar month view", () => {
  it("is a table with Monday-to-Sunday column headers and whole rows of 7 dates", () => {
    render(<Harness />);
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(5);
    for (const row of rows) expect(within(row).getAllByRole("cell")).toHaveLength(7);
  });

  it("shows each date as a time element, from the Monday before the 1st to the Sunday after the end", () => {
    render(<Harness />);
    const dates = Array.from(document.querySelectorAll("time")).map((t) => t.getAttribute("datetime"));
    expect(dates).toHaveLength(35);
    expect(dates[0]).toBe("2026-09-28");
    expect(dates[34]).toBe("2026-11-01");
  });

  it("puts each dated task on its due date", () => {
    render(<Harness />);
    expect(within(cell("2026-10-15")).getByRole("button", { name: /^Plan review/ })).toBeInTheDocument();
    expect(within(cell("2026-10-20")).getByRole("button", { name: /^Later this month/ })).toBeInTheDocument();
    expect(within(cell("2026-10-16")).getByRole("button", { name: /^Finished/ })).toBeInTheDocument();
  });

  it("shows tasks from leading days and leaves out tasks outside the visible dates", () => {
    render(<Harness />);
    expect(within(cell("2026-09-30")).getByRole("button", { name: /^Leading day/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Next month/ })).not.toBeInTheDocument();
  });

  it("does not show tasks that have no due date", () => {
    render(<Harness />);
    expect(screen.queryByText("No date")).not.toBeInTheDocument();
  });

  it("marks today with aria-current, a marker, and hidden text, and nothing else", () => {
    render(<Harness />);
    const current = document.querySelectorAll('[aria-current="date"]');
    expect(current).toHaveLength(1);
    expect(cell(TODAY)).toContainElement(current[0] as HTMLElement);
    expect(within(cell(TODAY)).getByText(/today/i)).toHaveClass("visually-hidden");
    expect(current[0]).toHaveClass("is-today");
    expect(within(cell("2026-10-14")).queryByText(/today/i)).not.toBeInTheDocument();
  });

  it("marks dates outside the month", () => {
    render(<Harness />);
    expect(cell("2026-09-30")).toHaveClass("is-outside");
    expect(cell("2026-11-01")).toHaveClass("is-outside");
    expect(cell("2026-10-15")).not.toHaveClass("is-outside");
  });

  it("gives completed and overdue tasks their styling and describes them", () => {
    render(<Harness />);
    const finished = within(cell("2026-10-16")).getByRole("button", { name: /^Finished/ });
    expect(finished.closest("li")).toHaveClass("is-completed");
    expect(finished).toHaveAccessibleName("Finished, medium priority, completed");

    const overdue = within(cell("2026-10-10")).getByRole("button", { name: /^Overdue one/ });
    expect(overdue.closest("li")).toHaveClass("is-overdue");
    expect(overdue).toHaveAccessibleName("Overdue one, medium priority, overdue");

    const today = within(cell(TODAY)).getByRole("button", { name: /^Plan review/ });
    expect(today).toHaveAccessibleName("Plan review, high priority");
  });

  it("shows a priority cue on each entry", () => {
    render(<Harness />);
    const entry = within(cell(TODAY)).getByRole("button", { name: /^Plan review/ }).closest("li");
    expect(entry?.querySelector(".priority-high")).not.toBeNull();
  });

  it("has a toolbar with Previous, Next, Today and a Calendar view group with Month pressed", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Calendar view" });
    expect(within(group).getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "false");
    expect(within(group).getByRole("button", { name: "Day" })).toHaveAttribute("aria-pressed", "false");
  });

  it("names the visible month in a polite heading", () => {
    render(<Harness />);
    const heading = screen.getByRole("heading", { name: "October 2026" });
    expect(heading).toHaveAttribute("aria-live", "polite");
  });

  it("steps to the next and previous month and back to today", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    expect(within(cell("2026-11-03")).getByRole("button", { name: /^Next month/ })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="date"]')).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="date"]')).not.toBeNull();
  });

  it("shows at most 3 tasks per date, then a +N more button that names the date", async () => {
    const crowded = ["a", "b", "c", "d", "e"].map((id) => task(id, `Crowded ${id}`, "2026-10-21"));
    render(<Harness tasks={crowded} />);

    const day = cell("2026-10-21");
    expect(within(day).getAllByRole("button", { name: /^Crowded/ })).toHaveLength(3);
    const more = within(day).getByRole("button", { name: "2 more tasks on Wednesday, October 21, 2026" });
    expect(more).toHaveTextContent("+2 more");

    await userEvent.click(more);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wednesday, October 21, 2026" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Crowded/ })).toHaveLength(5);
  });

  it("shows no +N more button when everything fits", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /more tasks on/ })).not.toBeInTheDocument();
  });

  it("says so when nothing is due this month", () => {
    render(<Harness tasks={[task("x", "Far away", "2027-05-05")]} />);
    expect(screen.getByText("Nothing due this month.")).toBeInTheDocument();
  });

  it("says filters hide the tasks, and offers Clear filters, when filters leave the period empty", async () => {
    const onClearFilters = vi.fn();
    render(<Harness tasks={[]} hiddenByFilters onClearFilters={onClearFilters} />);
    expect(screen.getByText("No tasks match your filters in this period.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("opens a task when its button is activated", async () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    await userEvent.click(within(cell("2026-10-20")).getByRole("button", { name: /^Later this month/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }));
  });

  it("orders a date's tasks with not-completed first, then by priority", () => {
    const list = [
      task("done", "Done high", "2026-10-22", { status: "completed", priority: "high" }),
      task("low", "Low", "2026-10-22", { priority: "low" }),
      task("high", "High", "2026-10-22", { priority: "high" }),
    ];
    render(<Harness tasks={list} />);
    const names = within(cell("2026-10-22"))
      .getAllByRole("button", { name: /priority/ })
      .map((b) => b.getAttribute("aria-label")?.split(",")[0]);
    expect(names).toEqual(["High", "Low", "Done high"]);
  });
});

describe("Calendar week view", () => {
  const week: CalendarState = { view: "week", anchor: TODAY };

  it("shows Monday to Sunday of the anchor week in one row", () => {
    render(<Harness initial={week} />);
    const dates = Array.from(document.querySelectorAll("tbody time")).map((t) => t.getAttribute("datetime"));
    expect(dates).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(within(screen.getByRole("table")).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(screen.getByRole("heading", { name: "Oct 12 to Oct 18, 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
  });

  it("puts each task on its date and marks today", () => {
    render(<Harness initial={week} />);
    expect(within(cell("2026-10-15")).getByRole("button", { name: /^Plan review/ })).toBeInTheDocument();
    expect(within(cell("2026-10-16")).getByRole("button", { name: /^Finished/ })).toBeInTheDocument();
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^Later this month/ })).not.toBeInTheDocument();
  });

  it("shows every task on a crowded date, with no +N more", () => {
    const crowded = ["a", "b", "c", "d", "e"].map((id) => task(id, `Crowded ${id}`, "2026-10-14"));
    render(<Harness tasks={crowded} initial={week} />);
    expect(within(cell("2026-10-14")).getAllByRole("button", { name: /^Crowded/ })).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /more tasks on/ })).not.toBeInTheDocument();
  });

  it("steps by a week and returns to the week containing today", async () => {
    render(<Harness initial={week} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Oct 19 to Oct 25, 2026" })).toBeInTheDocument();
    expect(within(cell("2026-10-20")).getByRole("button", { name: /^Later this month/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("heading", { name: "Oct 5 to Oct 11, 2026" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "Oct 12 to Oct 18, 2026" })).toBeInTheDocument();
  });

  it("says so when nothing is due this week", () => {
    render(<Harness initial={{ view: "week", anchor: "2026-12-10" }} />);
    expect(screen.getByText("Nothing due this week.")).toBeInTheDocument();
  });
});

describe("Calendar day view", () => {
  const day: CalendarState = { view: "day", anchor: TODAY };

  it("shows one date with every task due that day, and no grid", () => {
    const crowded = ["a", "b", "c", "d", "e"].map((id) => task(id, `Crowded ${id}`, TODAY));
    render(<Harness tasks={[...crowded, task("x", "Other day", "2026-10-16")]} initial={day} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Thursday, October 15, 2026" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Crowded/ })).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /^Other day/ })).not.toBeInTheDocument();
    expect(document.querySelectorAll("time")).toHaveLength(1);
    expect(document.querySelector('[aria-current="date"]')).not.toBeNull();
  });

  it("steps by a day", async () => {
    render(<Harness initial={day} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Friday, October 16, 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Finished/ })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="date"]')).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("heading", { name: "Wednesday, October 14, 2026" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "Thursday, October 15, 2026" })).toBeInTheDocument();
  });

  it("says that nothing is due on a day with no tasks", () => {
    render(<Harness initial={{ view: "day", anchor: "2026-10-22" }} />);
    expect(screen.getByText("Nothing due on Thursday, October 22, 2026.")).toBeInTheDocument();
  });
});

describe("switching between month, week, and day", () => {
  it("keeps the date the user was looking at in view", async () => {
    render(<Harness initial={{ view: "month", anchor: "2026-10-22" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(screen.getByRole("heading", { name: "Oct 19 to Oct 25, 2026" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getByRole("heading", { name: "Thursday, October 22, 2026" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(document.querySelector('time[datetime="2026-10-22"]')).not.toBeNull();
  });

  it("marks the chosen view as pressed", async () => {
    render(<Harness />);
    for (const name of ["Week", "Day", "Month"]) {
      await userEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    }
  });
});

/** A minimal stand-in for the browser's DataTransfer, which jsdom does not provide. */
function makeDataTransfer(carries: string[] = []) {
  const store: Record<string, string> = {};
  return {
    setData(type: string, value: string) {
      store[type] = value;
    },
    getData(type: string) {
      return store[type] ?? "";
    },
    get types() {
      return [...Object.keys(store), ...carries];
    },
    effectAllowed: "uninitialized",
    dropEffect: "none",
  };
}

function entryItem(date: string, title: RegExp): HTMLElement {
  const li = within(cell(date)).getByRole("button", { name: title }).closest("li");
  if (!li) throw new Error("entry not found");
  return li;
}

describe("Calendar dragging a task to another date", () => {
  it("makes every entry draggable", () => {
    render(<Harness />);
    expect(entryItem("2026-10-20", /^Later this month/)).toHaveAttribute("draggable", "true");
  });

  it("marks the date under the dragged task as the drop target, and unmarks it on leaving", () => {
    render(<Harness />);
    const dt = makeDataTransfer();
    fireEvent.dragStart(entryItem("2026-10-20", /^Later this month/), { dataTransfer: dt });

    fireEvent.dragEnter(cell("2026-10-22"), { dataTransfer: dt });
    expect(cell("2026-10-22")).toHaveClass("is-drop-target");
    expect(cell("2026-10-23")).not.toHaveClass("is-drop-target");

    fireEvent.dragLeave(cell("2026-10-22"), { dataTransfer: dt });
    expect(cell("2026-10-22")).not.toHaveClass("is-drop-target");
  });

  it("does not unmark a date when the pointer only moves onto one of its children", () => {
    render(<Harness />);
    const dt = makeDataTransfer();
    fireEvent.dragStart(entryItem("2026-10-20", /^Later this month/), { dataTransfer: dt });
    fireEvent.dragEnter(cell("2026-10-15"), { dataTransfer: dt });
    const child = within(cell("2026-10-15")).getByRole("button", { name: /^Plan review/ });
    // jsdom ignores relatedTarget in the event init, so set it on the event itself.
    const leave = createEvent.dragLeave(cell("2026-10-15"), { dataTransfer: dt });
    Object.defineProperty(leave, "relatedTarget", { value: child });
    fireEvent(cell("2026-10-15"), leave);
    expect(cell("2026-10-15")).toHaveClass("is-drop-target");
  });

  it("calls onReschedule with the task and the new date when dropped on another date", () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    const dt = makeDataTransfer();
    fireEvent.dragStart(entryItem("2026-10-20", /^Later this month/), { dataTransfer: dt });
    fireEvent.dragOver(cell("2026-10-22"), { dataTransfer: dt });
    fireEvent.drop(cell("2026-10-22"), { dataTransfer: dt });

    expect(onReschedule).toHaveBeenCalledTimes(1);
    expect(onReschedule).toHaveBeenCalledWith("2", "2026-10-22");
    expect(cell("2026-10-22")).not.toHaveClass("is-drop-target");
  });

  it("accepts a drop on a leading or trailing date from the next or previous month", () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    const dt = makeDataTransfer();
    fireEvent.dragStart(entryItem("2026-10-20", /^Later this month/), { dataTransfer: dt });
    fireEvent.drop(cell("2026-09-30"), { dataTransfer: dt });
    expect(onReschedule).toHaveBeenCalledWith("2", "2026-09-30");
  });

  it("changes nothing when dropped on its own date", () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    const dt = makeDataTransfer();
    fireEvent.dragStart(entryItem("2026-10-20", /^Later this month/), { dataTransfer: dt });
    fireEvent.drop(cell("2026-10-20"), { dataTransfer: dt });
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("changes nothing when dropped outside any date", () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    const dt = makeDataTransfer();
    fireEvent.dragStart(entryItem("2026-10-20", /^Later this month/), { dataTransfer: dt });
    fireEvent.drop(screen.getByRole("heading", { name: "October 2026" }), { dataTransfer: dt });
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("ignores things that are not a dragged task", () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    const files = makeDataTransfer(["Files"]);
    fireEvent.dragEnter(cell("2026-10-22"), { dataTransfer: files });
    expect(cell("2026-10-22")).not.toHaveClass("is-drop-target");
    fireEvent.drop(cell("2026-10-22"), { dataTransfer: files });
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("clears the drop target when the drag ends without a drop", () => {
    render(<Harness />);
    const dt = makeDataTransfer();
    const entry = entryItem("2026-10-20", /^Later this month/);
    fireEvent.dragStart(entry, { dataTransfer: dt });
    fireEvent.dragEnter(cell("2026-10-22"), { dataTransfer: dt });
    fireEvent.dragEnd(entry, { dataTransfer: dt });
    expect(cell("2026-10-22")).not.toHaveClass("is-drop-target");
  });

  it("works in the week view too", () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} initial={{ view: "week", anchor: TODAY }} />);
    const dt = makeDataTransfer();
    fireEvent.dragStart(entryItem("2026-10-15", /^Plan review/), { dataTransfer: dt });
    fireEvent.drop(cell("2026-10-17"), { dataTransfer: dt });
    expect(onReschedule).toHaveBeenCalledWith("1", "2026-10-17");
  });
});

const liveRegion = () => screen.getByRole("status");

describe("Calendar moving a task with the keyboard", () => {
  const moveButton = (title: string) => screen.getByRole("button", { name: `Move ${title}` });

  it("gives every entry a Move button named for the task", () => {
    render(<Harness />);
    expect(moveButton("Plan review")).toBeInTheDocument();
    expect(moveButton("Later this month")).toBeInTheDocument();
  });

  it("starts a move, announces the instructions, and marks the starting date", async () => {
    render(<Harness />);
    await userEvent.click(moveButton("Plan review"));

    expect(liveRegion()).toHaveTextContent(
      "Moving Plan review. Use the arrow keys to choose a date, Enter to drop it, Escape to cancel.",
    );
    expect(liveRegion()).toHaveTextContent("Thursday, October 15, 2026");
    expect(cell(TODAY)).toHaveClass("is-drop-target");
    expect(moveButton("Plan review")).toHaveFocus();
  });

  it("moves the target a day with Left and Right and a week with Up and Down, announcing each", async () => {
    render(<Harness />);
    await userEvent.click(moveButton("Plan review"));

    await userEvent.keyboard("{ArrowRight}");
    expect(cell("2026-10-16")).toHaveClass("is-drop-target");
    expect(cell(TODAY)).not.toHaveClass("is-drop-target");
    expect(liveRegion()).toHaveTextContent("Friday, October 16, 2026");

    await userEvent.keyboard("{ArrowDown}");
    expect(cell("2026-10-23")).toHaveClass("is-drop-target");
    expect(liveRegion()).toHaveTextContent("Friday, October 23, 2026");

    await userEvent.keyboard("{ArrowLeft}");
    expect(cell("2026-10-22")).toHaveClass("is-drop-target");

    await userEvent.keyboard("{ArrowUp}");
    expect(cell("2026-10-15")).toHaveClass("is-drop-target");
  });

  it("drops with Enter: reschedules, announces, clears the marker, and keeps focus on Move", async () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    await userEvent.click(moveButton("Plan review"));
    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(onReschedule).toHaveBeenCalledTimes(1);
    expect(onReschedule).toHaveBeenCalledWith("1", "2026-10-22");
    expect(liveRegion()).toHaveTextContent("Plan review moved to Thursday, October 22, 2026.");
    expect(document.querySelector(".is-drop-target")).toBeNull();
    expect(moveButton("Plan review")).toHaveFocus();
  });

  it("takes three key presses to move a task one day or one week", async () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    moveButton("Plan review").focus();
    await userEvent.keyboard("{Enter}{ArrowRight}{Enter}");
    expect(onReschedule).toHaveBeenLastCalledWith("1", "2026-10-16");

    moveButton("Plan review").focus();
    await userEvent.keyboard("{Enter}{ArrowDown}{Enter}");
    expect(onReschedule).toHaveBeenLastCalledWith("1", "2026-10-22");
  });

  it("cancels with Escape: nothing changes and focus stays on Move", async () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    await userEvent.click(moveButton("Plan review"));
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{Escape}");

    expect(onReschedule).not.toHaveBeenCalled();
    expect(liveRegion()).toHaveTextContent("Move cancelled.");
    expect(document.querySelector(".is-drop-target")).toBeNull();
    expect(moveButton("Plan review")).toHaveFocus();
  });

  it("drops without a change when the target is the starting date", async () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    await userEvent.click(moveButton("Plan review"));
    await userEvent.keyboard("{Enter}");
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("brings another month into view when the target leaves the visible dates", async () => {
    const onReschedule = vi.fn();
    const list = [task("e", "Month end", "2026-11-01")];
    render(<Harness tasks={list} onReschedule={onReschedule} />);

    await userEvent.click(moveButton("Month end"));
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    expect(cell("2026-11-02")).toHaveClass("is-drop-target");
    expect(moveButton("Month end")).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onReschedule).toHaveBeenCalledWith("e", "2026-11-02");
  });

  it("works in the week and day views", async () => {
    const onReschedule = vi.fn();
    const { unmount } = render(<Harness onReschedule={onReschedule} initial={{ view: "week", anchor: TODAY }} />);
    await userEvent.click(moveButton("Plan review"));
    await userEvent.keyboard("{ArrowRight}{Enter}");
    expect(onReschedule).toHaveBeenLastCalledWith("1", "2026-10-16");
    unmount();

    render(<Harness onReschedule={onReschedule} initial={{ view: "day", anchor: TODAY }} />);
    await userEvent.click(moveButton("Plan review"));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { name: "Friday, October 16, 2026" })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(onReschedule).toHaveBeenLastCalledWith("1", "2026-10-16");
  });

  it("ends the move when focus moves to another control", async () => {
    const onReschedule = vi.fn();
    render(<Harness onReschedule={onReschedule} />);
    await userEvent.click(moveButton("Plan review"));
    await userEvent.tab();
    expect(document.querySelector(".is-drop-target")).toBeNull();
    await userEvent.keyboard("{Enter}");
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("does not open the task when the Move button is used", async () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    await userEvent.click(moveButton("Plan review"));
    await userEvent.keyboard("{ArrowRight}{Enter}");
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe("Calendar repeating tasks", () => {
  const rule = { kind: "weekly" as const, weekdays: [3], dayOfMonth: null, endDate: null };
  const open = task("r1", "Water plants", TODAY, { recurrence: rule, seriesId: "s1" });
  const preview = (date: string): Preview => ({ task: open, date, title: "Water plants", priority: "medium" });

  it("marks a repeating entry with a symbol and says 'repeats' in its name", () => {
    render(<Harness tasks={[open]} />);
    const button = within(cell(TODAY)).getByRole("button", { name: "Water plants, medium priority, repeats" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("does not mark an ordinary entry as repeating", () => {
    render(<Harness tasks={[task("p", "Plain", TODAY)]} />);
    expect(within(cell(TODAY)).getByRole("button", { name: "Plain, medium priority" })).toBeInTheDocument();
  });

  it("draws each preview on its date as an upcoming, repeating entry", () => {
    render(<Harness tasks={[open]} previews={[preview("2026-10-22"), preview("2026-10-29")]} />);
    expect(
      within(cell("2026-10-22")).getByRole("button", { name: "Water plants, medium priority, repeats, upcoming" }),
    ).toBeInTheDocument();
    expect(within(cell("2026-10-29")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("cannot drag or move a preview", () => {
    render(<Harness tasks={[open]} previews={[preview("2026-10-22")]} />);
    const entry = within(cell("2026-10-22")).getByRole("listitem");
    expect(entry).toHaveClass("cal-preview");
    expect(entry).not.toHaveAttribute("draggable", "true");
    expect(within(entry).queryByRole("button", { name: /^Move/ })).not.toBeInTheDocument();
  });

  it("opens the series' open occurrence when a preview is selected", async () => {
    const onOpen = vi.fn();
    render(<Harness tasks={[open]} previews={[preview("2026-10-22")]} onOpen={onOpen} />);
    await userEvent.click(within(cell("2026-10-22")).getByRole("button", { name: /upcoming/ }));
    expect(onOpen).toHaveBeenCalledWith(open);
  });

  it("counts previews toward '+N more' in the month, and lists them all in the day view", async () => {
    const crowded = [
      task("a", "A", "2026-10-22"),
      task("b", "B", "2026-10-22"),
      task("c", "C", "2026-10-22"),
    ];
    render(<Harness tasks={[open, ...crowded]} previews={[preview("2026-10-22")]} />);
    expect(within(cell("2026-10-22")).getByRole("button", { name: /1 more task/ })).toBeInTheDocument();
    // Real entries come first, so the preview is the one that is folded away.
    expect(within(cell("2026-10-22")).queryByRole("button", { name: /upcoming/ })).not.toBeInTheDocument();

    await userEvent.click(within(cell("2026-10-22")).getByRole("button", { name: /1 more task/ }));
    expect(screen.getByRole("button", { name: /upcoming/ })).toBeInTheDocument();
  });

  it("shows previews in the week view and keeps the period from looking empty", async () => {
    render(<Harness tasks={[]} previews={[preview("2026-10-22")]} initial={{ view: "week", anchor: "2026-10-22" }} />);
    expect(screen.getByRole("button", { name: /upcoming/ })).toBeInTheDocument();
    expect(screen.queryByText("Nothing due this week.")).not.toBeInTheDocument();
  });
});
