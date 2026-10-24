import { expect, test, type Locator, type Page } from "@playwright/test";

const stamp = "2026-10-01T00:00:00.000Z";

/** The app's idea of "today" in these tests: Thursday 15 October 2026. */
const NOW = new Date(2026, 9, 15, 10, 0, 0);

function task(id: string, title: string, dueDate: string | null, overrides: Record<string, unknown> = {}) {
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

async function open(page: Page, tasks: unknown[]) {
  await page.clock.setFixedTime(NOW);
  await page.addInitScript((doc) => {
    if (!localStorage.getItem("focus-app:tasks")) {
      localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
    }
  }, { version: 1, tasks });
  await page.goto("/");
}

const cell = (page: Page, date: string) => page.locator(`td:has(time[datetime="${date}"])`);

/*
 * Dragging, driven deterministically. The page receives the same events a browser sends during a
 * drag (dragstart, dragenter, dragover, drop, dragend), built with a real DataTransfer, so the
 * app's handlers run exactly as they do for a user. Playwright's own mouse-driven drag emulation
 * drops the final dragover when the page re-renders mid-drag, which made it unreliable here;
 * pressing and moving the mouse by hand in Chromium does start the drag and move the task.
 */
async function dragStart(from: Locator) {
  await from.evaluate((el) => {
    const item = el.closest("li");
    if (!item) throw new Error("drag source is not inside a list item");
    const data = new DataTransfer();
    Object.assign(window, { dragData: data, dragItem: item });
    item.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: data }));
  });
}

/** Move the dragged task over a date. Returns whether the date accepts a drop. */
async function dragOver(to: Locator): Promise<boolean> {
  return to.evaluate((el) => {
    const data = Reflect.get(window, "dragData");
    const enter = new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: data });
    el.dispatchEvent(enter);
    const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: data });
    el.dispatchEvent(over);
    return over.defaultPrevented;
  });
}

/** Release the dragged task over `to`, as a browser would: only a date that accepted the drag gets a drop. */
async function dragRelease(to: Locator) {
  await to.evaluate((el) => {
    const data = Reflect.get(window, "dragData");
    const item = Reflect.get(window, "dragItem");
    const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: data });
    el.dispatchEvent(over);
    if (over.defaultPrevented) {
      el.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data }));
    } else {
      el.dispatchEvent(new DragEvent("dragleave", { bubbles: true, dataTransfer: data }));
    }
    if (item instanceof Element) {
      item.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: data }));
    }
  });
}

async function drag(_page: Page, from: Locator, to: Locator) {
  await dragStart(from);
  await dragOver(to);
  await dragRelease(to);
}

const standard = [
  task("1", "Plan review", "2026-10-15", { priority: "high" }),
  task("2", "In five days", "2026-10-20"),
  task("3", "Next month task", "2026-11-03"),
  task("4", "Overdue one", "2026-10-10"),
  task("5", "Finished one", "2026-10-16", { status: "completed" }),
  task("6", "No date", null),
];

test.describe("month calendar", () => {
  test("shows dated tasks on their dates, marks today, and navigates", async ({ page }) => {
    await open(page, standard);
    await page.getByRole("button", { name: "Calendar" }).click();

    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();

    await expect(cell(page, "2026-10-15").getByRole("button", { name: /^Plan review/ })).toBeVisible();
    await expect(cell(page, "2026-10-20").getByRole("button", { name: /^In five days/ })).toBeVisible();
    await expect(cell(page, "2026-10-10").getByRole("button", { name: /^Overdue one/ })).toContainText("Overdue one");
    await expect(cell(page, "2026-10-16").getByRole("button", { name: /^Finished one/ })).toBeVisible();
    await expect(page.getByText("No date")).toHaveCount(0);
    await expect(page.getByText("Next month task")).toHaveCount(0);

    // Today is marked in exactly one place, not by colour alone.
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
    await expect(cell(page, "2026-10-15").locator('[aria-current="date"]')).toBeVisible();
    await expect(cell(page, "2026-10-15")).toContainText("today");

    // Whole Monday-to-Sunday rows: 28 September to 1 November.
    await expect(page.locator("tbody time").first()).toHaveAttribute("datetime", "2026-09-28");
    await expect(page.locator("tbody time").last()).toHaveAttribute("datetime", "2026-11-01");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
    await expect(cell(page, "2026-11-03").getByRole("button", { name: /^Next month task/ })).toBeVisible();
    await expect(page.locator('[aria-current="date"]')).toHaveCount(0);

    await page.getByRole("button", { name: "Previous" }).click();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByRole("heading", { name: "September 2026" })).toBeVisible();

    await page.getByRole("button", { name: "Today" }).click();
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
  });

  test("switches back to the unchanged list", async ({ page }) => {
    await open(page, standard);
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6);

    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0);

    await page.getByRole("button", { name: "List" }).click();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6);
  });

  test("the list's filters apply to the calendar", async ({ page }) => {
    await open(page, standard);
    await page.getByRole("button", { name: "Calendar" }).click();

    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("completed");
    await expect(page.getByRole("button", { name: /^Finished one/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Plan review/ })).toHaveCount(0);

    await page.getByRole("combobox", { name: "Priority", exact: true }).selectOption("high");
    await expect(page.getByText("No tasks match your filters in this period.")).toBeVisible();

    await page.getByRole("region", { name: "Calendar" }).getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("button", { name: /^Plan review/ })).toBeVisible();
  });

  test("the date a user was looking at stays when switching away and back", async ({ page }) => {
    await open(page, standard);
    await page.getByRole("button", { name: "Calendar" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "List" }).click();
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
  });
});

test.describe("week and day views", () => {
  test("show the right dates and tasks, and step by a week or a day", async ({ page }) => {
    await open(page, standard);
    await page.getByRole("button", { name: "Calendar" }).click();

    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Oct 12 to Oct 18, 2026" })).toBeVisible();
    await expect(page.locator("tbody time")).toHaveCount(7);
    await expect(cell(page, "2026-10-15").getByRole("button", { name: /^Plan review/ })).toBeVisible();
    await expect(cell(page, "2026-10-16").getByRole("button", { name: /^Finished one/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^In five days/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Oct 19 to Oct 25, 2026" })).toBeVisible();
    await expect(cell(page, "2026-10-20").getByRole("button", { name: /^In five days/ })).toBeVisible();

    await page.getByRole("button", { name: "Today" }).click();
    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Thursday, October 15, 2026" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Plan review/ })).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Friday, October 16, 2026" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Finished one/ })).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Nothing due on Saturday, October 17, 2026.")).toBeVisible();
  });

  test("switching views keeps the date in view", async ({ page }) => {
    await open(page, standard);
    await page.getByRole("button", { name: "Calendar" }).click();
    await page.getByRole("button", { name: "Next" }).click(); // November
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.locator('tbody time[datetime="2026-11-15"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sunday, November 15, 2026" })).toBeVisible();
    await page.getByRole("button", { name: "Month", exact: true }).click();
    await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
  });

  test("a crowded day shows three tasks and +N more, which opens that day", async ({ page }) => {
    const crowded = ["A", "B", "C", "D", "E"].map((id) => task(`c${id}`, `Crowded ${id}`, "2026-10-21"));
    await open(page, crowded);
    await page.getByRole("button", { name: "Calendar" }).click();

    await expect(cell(page, "2026-10-21").getByRole("button", { name: /^Crowded/ })).toHaveCount(3);
    await page.getByRole("button", { name: "2 more tasks on Wednesday, October 21, 2026" }).click();

    await expect(page.getByRole("heading", { name: "Wednesday, October 21, 2026" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Crowded/ })).toHaveCount(5);
  });
});

test.describe("opening a task from the calendar", () => {
  const detailed = [
    task("d1", "Plan trip", "2026-10-20", {
      description: "Flights and hotel",
      priority: "high",
      status: "in-progress",
      tags: ["travel"],
    }),
  ];

  test("click opens the task form modal pre-filled, and a new due date moves the task", async ({ page }) => {
    await open(page, detailed);
    await page.getByRole("button", { name: "Calendar" }).click();

    await cell(page, "2026-10-20").getByRole("button", { name: /^Plan trip/ }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await expect(dialog.getByLabel("Title")).toHaveValue("Plan trip");
    await expect(dialog.getByLabel("Description")).toHaveValue("Flights and hotel");
    await expect(dialog.getByLabel("Priority")).toHaveValue("high");
    await expect(dialog.getByLabel("Status")).toHaveValue("in-progress");
    await expect(dialog.getByLabel("Due date")).toHaveValue("2026-10-20");
    await expect(dialog.getByLabel("Tags")).toHaveValue("travel");

    await dialog.getByLabel("Due date").fill("2026-10-27");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(cell(page, "2026-10-27").getByRole("button", { name: /^Plan trip/ })).toBeVisible();
    await expect(cell(page, "2026-10-20").getByRole("button", { name: /^Plan trip/ })).toHaveCount(0);
  });

  test("opens from the keyboard, and closing returns focus to the same task", async ({ page }) => {
    await open(page, detailed);
    await page.getByRole("button", { name: "Calendar" }).click();

    const entry = cell(page, "2026-10-20").getByRole("button", { name: /^Plan trip/ });
    await entry.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Edit task" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(entry).toBeFocused();
  });

  test("works from the week and day views too", async ({ page }) => {
    await open(page, detailed);
    await page.getByRole("button", { name: "Calendar" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Today" }).click();

    await page.getByRole("button", { name: "Week", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: /^Plan trip/ }).click();
    await expect(page.getByRole("dialog", { name: "Edit task" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Thursday, October 22, 2026" })).toBeVisible();
    await page.getByRole("button", { name: "Previous" }).click();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByRole("heading", { name: "Tuesday, October 20, 2026" })).toBeVisible();
    await page.getByRole("button", { name: /^Plan trip/ }).click();
    await expect(page.getByRole("dialog", { name: "Edit task" })).toBeVisible();
  });
});

test.describe("rescheduling by dragging", () => {
  const items = [task("r1", "Reschedule me", "2026-10-20"), task("r2", "Stay put", "2026-10-21")];

  const entry = (page: Page, date: string, title = "Reschedule me") =>
    cell(page, date).getByRole("button", { name: new RegExp(`^${title}`) });

  test("a drag changes the due date at once and the change survives a reload", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await drag(page, entry(page, "2026-10-20"), cell(page, "2026-10-23"));

    await expect(entry(page, "2026-10-23")).toBeVisible();
    await expect(entry(page, "2026-10-20")).toHaveCount(0);
    await expect(entry(page, "2026-10-21", "Stay put")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(entry(page, "2026-10-23")).toBeVisible();
    await expect(entry(page, "2026-10-20")).toHaveCount(0);
  });

  test("the date under the dragged task is marked while the pointer is over it, then cleared", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await dragStart(entry(page, "2026-10-20"));
    expect(await dragOver(cell(page, "2026-10-22"))).toBe(true);
    await expect(cell(page, "2026-10-22")).toHaveClass(/is-drop-target/);

    expect(await dragOver(cell(page, "2026-10-23"))).toBe(true);
    await expect(cell(page, "2026-10-23")).toHaveClass(/is-drop-target/);

    await dragRelease(cell(page, "2026-10-23"));
    await expect(page.locator(".is-drop-target")).toHaveCount(0);
    await expect(entry(page, "2026-10-23")).toBeVisible();
    await expect(entry(page, "2026-10-22")).toHaveCount(0);
  });

  test("the heading and toolbar do not accept a dropped task", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await dragStart(entry(page, "2026-10-20"));
    expect(await dragOver(page.getByRole("heading", { name: "October 2026" }))).toBe(false);
    expect(await dragOver(cell(page, "2026-10-24"))).toBe(true);
    await dragRelease(page.getByRole("heading", { name: "October 2026" }));
    await expect(entry(page, "2026-10-20")).toBeVisible();
  });

  test("dropping on its own date or outside any date changes nothing", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await drag(page, entry(page, "2026-10-20"), cell(page, "2026-10-20"));
    await expect(entry(page, "2026-10-20")).toBeVisible();

    await drag(page, entry(page, "2026-10-20"), page.getByRole("heading", { name: "October 2026" }));
    await expect(entry(page, "2026-10-20")).toBeVisible();
  });

  test("a task dragged to an earlier date shows as overdue", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await drag(page, entry(page, "2026-10-20"), cell(page, "2026-10-05"));

    const moved = entry(page, "2026-10-05");
    await expect(moved).toHaveAccessibleName("Reschedule me, medium priority, overdue");
    await expect(moved.locator("xpath=ancestor::li")).toHaveClass(/is-overdue/);
  });

  test("dragging works in the week view", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Today" }).click();
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await drag(page, entry(page, "2026-10-20"), cell(page, "2026-10-24"));
    await expect(entry(page, "2026-10-24")).toBeVisible();
  });

  test("a drag in one tab shows in another tab without a reload", async ({ context }) => {
    await context.addInitScript((doc) => {
      if (!localStorage.getItem("focus-app:tasks")) {
        localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
      }
    }, { version: 1, tasks: items });
    const first = await context.newPage();
    const second = await context.newPage();
    for (const page of [first, second]) {
      await page.clock.setFixedTime(NOW);
      await page.goto("/");
      await page.getByRole("button", { name: "Calendar" }).click();
    }

    await drag(first, entry(first, "2026-10-20"), cell(first, "2026-10-26"));

    await expect(entry(second, "2026-10-26")).toBeVisible();
    await expect(entry(second, "2026-10-20")).toHaveCount(0);
  });
});

test.describe("rescheduling by keyboard", () => {
  const items = [task("k1", "Reschedule me", "2026-10-20"), task("k2", "Stay put", "2026-10-21")];

  const move = (page: Page, title = "Reschedule me") =>
    page.getByRole("button", { name: `Move ${title}` });
  const entry = (page: Page, date: string, title = "Reschedule me") =>
    cell(page, date).getByRole("button", { name: new RegExp(`^${title}`) });

  test("Move, an arrow key, and Enter move a task by a day: three key presses", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await move(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status", { name: "Calendar announcements" }).filter({ hasText: "Moving Reschedule me" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(cell(page, "2026-10-21")).toHaveClass(/is-drop-target/);
    await page.keyboard.press("Enter");

    await expect(entry(page, "2026-10-21")).toBeVisible();
    await expect(entry(page, "2026-10-20")).toHaveCount(0);
    await expect(move(page)).toBeFocused();
    await expect(page.getByRole("status", { name: "Calendar announcements" })).toContainText("Reschedule me moved to Wednesday, October 21, 2026.");
  });

  test("a week at a time with the down arrow, and the change persists", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await move(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(entry(page, "2026-10-27")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(entry(page, "2026-10-27")).toBeVisible();
  });

  test("Escape cancels the move", async ({ page }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    await move(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");

    await expect(entry(page, "2026-10-20")).toBeVisible();
    await expect(page.locator(".is-drop-target")).toHaveCount(0);
    await expect(move(page)).toBeFocused();
    await expect(page.getByRole("status", { name: "Calendar announcements" })).toContainText("Move cancelled.");
  });

  test("the target can cross into the next month, and the calendar follows it", async ({ page }) => {
    await open(page, [task("k3", "Month end", "2026-10-30")]);
    await page.getByRole("button", { name: "Calendar" }).click();

    await move(page, "Month end").focus();
    await page.keyboard.press("Enter");
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
    await expect(cell(page, "2026-11-02")).toHaveClass(/is-drop-target/);
    await expect(move(page, "Month end")).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(entry(page, "2026-11-02", "Month end")).toBeVisible();
  });

  test("works in the week and day views", async ({ page }) => {
    await open(page, [task("k4", "Reschedule me", "2026-10-15")]);
    await page.getByRole("button", { name: "Calendar" }).click();

    await page.getByRole("button", { name: "Week", exact: true }).click();
    await move(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(entry(page, "2026-10-16")).toBeVisible();

    await page.getByRole("button", { name: "Day", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Friday, October 16, 2026" })).toBeVisible();
    await move(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "Saturday, October 17, 2026" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /^Reschedule me/ })).toBeVisible();
  });

  test("the Move button appears when its task has focus and stays out of the way otherwise", async ({
    page,
  }) => {
    await open(page, items);
    await page.getByRole("button", { name: "Calendar" }).click();

    const opacity = () => move(page).evaluate((el) => getComputedStyle(el).opacity);
    expect(await opacity()).toBe("0");

    await entry(page, "2026-10-20").focus();
    await expect.poll(opacity).toBe("1");

    await page.keyboard.press("Tab");
    await expect(move(page)).toBeFocused();
    expect(await opacity()).toBe("1");
  });

  test("a keyboard move in one tab shows in another tab without a reload", async ({ context }) => {
    await context.addInitScript((doc) => {
      if (!localStorage.getItem("focus-app:tasks")) {
        localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
      }
    }, { version: 1, tasks: items });
    const first = await context.newPage();
    const second = await context.newPage();
    for (const page of [first, second]) {
      await page.clock.setFixedTime(NOW);
      await page.goto("/");
      await page.getByRole("button", { name: "Calendar" }).click();
    }

    await move(first).focus();
    await first.keyboard.press("Enter");
    await first.keyboard.press("ArrowDown");
    await first.keyboard.press("Enter");

    await expect(entry(second, "2026-10-27")).toBeVisible();
    await expect(entry(second, "2026-10-20")).toHaveCount(0);
  });
});

/** Name of the focused element: aria-label, wrapping label text, or its own text. */
async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return "";
    return el.getAttribute("aria-label") ?? (el.textContent ?? "").trim();
  });
}

async function hasVisibleFocus(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement) || el === document.body) return false;
    const style = getComputedStyle(el);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  });
}

/** Tab until the focused control's name starts with `name`, checking each stop has a focus ring. */
async function tabTo(page: Page, name: string, maxTabs = 60) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    if ((await focusedName(page)).startsWith(name)) {
      expect(await hasVisibleFocus(page), `focus ring on "${name}"`).toBe(true);
      return;
    }
  }
  throw new Error(`Could not reach "${name}" with the keyboard`);
}

test.describe("keyboard only", () => {
  test("switch views, change period and mode, open a task, and move a task, with no pointer", async ({
    page,
  }) => {
    await open(page, standard);

    await tabTo(page, "Calendar");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();

    await tabTo(page, "Next");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
    await tabTo(page, "Today");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();

    await tabTo(page, "Week");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Oct 12 to Oct 18, 2026" })).toBeVisible();
    await tabTo(page, "Month");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();

    // Open a task, then close it: focus comes back to the same task.
    await tabTo(page, "Plan review");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Edit task" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await focusedName(page)).toMatch(/^Plan review/);

    // The next Tab stop is that task's Move button; three key presses move it a day.
    await page.keyboard.press("Tab");
    expect(await focusedName(page)).toBe("Move Plan review");
    expect(await hasVisibleFocus(page)).toBe(true);
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(cell(page, "2026-10-16").getByRole("button", { name: /^Plan review/ })).toBeVisible();
    expect(await focusedName(page)).toBe("Move Plan review");
  });
});

test.describe("speed", () => {
  test("with 500 tasks, switching views and moving to another month show the result in under 1 second", async ({
    page,
  }) => {
    const many = Array.from({ length: 500 }, (_, i) => {
      const day = 1 + (i % 28);
      const month = 9 + (i % 3); // October, November, December (0-based 9 to 11 are written 10 to 12)
      return task(`s${i}`, `Task number ${i}`, `2026-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, {
        priority: ["low", "medium", "high"][i % 3],
      });
    });
    await open(page, many);

    // Time from the click until the browser has painted the updated calendar.
    const timed = (name: string) =>
      page.evaluate(async (label) => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (el) => el.textContent?.trim() === label,
        );
        if (!button) throw new Error(`button ${label} not found`);
        const start = performance.now();
        button.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return performance.now() - start;
      }, name);

    expect(await timed("Calendar")).toBeLessThan(1000);
    await expect(page.getByRole("table")).toBeVisible();
    expect(await timed("Next")).toBeLessThan(1000);
    expect(await timed("Week")).toBeLessThan(1000);
    expect(await timed("Day")).toBeLessThan(1000);
    expect(await timed("Month")).toBeLessThan(1000);
    expect(await timed("List")).toBeLessThan(1000);
  });
});
