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

/** A task that belongs to series `s1`, with the series own details recorded as its template. */
function recurring(
  id: string,
  title: string,
  dueDate: string,
  rule: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  const made = task(id, title, dueDate, { recurrence: rule, seriesId: "s1", ...overrides });
  return {
    ...made,
    seriesTemplate: { title: made.title, description: made.description, priority: made.priority, tags: made.tags },
  };
}

const weekly = (endDate: string | null = null) => ({ kind: "weekly", weekdays: [3], dayOfMonth: null, endDate });
const daily = (endDate: string | null = null) => ({ kind: "daily", weekdays: [], dayOfMonth: null, endDate });

async function open(page: Page, tasks: unknown[]) {
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(
    (doc) => {
      if (!localStorage.getItem("focus-app:tasks")) {
        localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
      }
    },
    { version: 1, tasks },
  );
  await page.goto("/");
}

const item = (page: Page, title: string) => page.getByRole("listitem").filter({ hasText: title });
const repeatSelect = (scope: Locator) => scope.getByRole("combobox", { name: "Repeat", exact: true });

test.describe("making a task repeat", () => {
  test("a weekly repeat with an end date is saved, labelled in the list, and kept when reopened", async ({
    page,
  }) => {
    await open(page, [task("t1", "Water plants", "2026-10-15")]);

    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await repeatSelect(dialog).selectOption("weekly");
    await expect(dialog.getByText("Repeats every week on Thursday.")).toBeVisible();
    await dialog.getByLabel("Repeat until (optional)").fill("2026-12-31");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(item(page, "Water plants")).toContainText("Repeats weekly on Thursday until Dec 31, 2026");

    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const reopened = page.getByRole("dialog", { name: "Edit task" });
    await expect(repeatSelect(reopened)).toHaveValue("weekly");
    await expect(reopened.getByLabel("Repeat until (optional)")).toHaveValue("2026-12-31");
  });

  test("selected days are saved and labelled", async ({ page }) => {
    await open(page, [task("t1", "Gym", "2026-10-15")]);

    await page.getByRole("button", { name: "Edit Gym" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await repeatSelect(dialog).selectOption("days");
    await dialog.getByRole("checkbox", { name: "Monday" }).check();
    await dialog.getByRole("checkbox", { name: "Wednesday" }).check();
    await dialog.getByRole("checkbox", { name: "Friday" }).check();
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(item(page, "Gym")).toContainText("Repeats Mon, Wed, Fri");
  });

  test("daily and monthly repeats can be set when creating a task", async ({ page }) => {
    await open(page, []);

    await page.getByRole("button", { name: "Add your first task" }).click();
    let dialog = page.getByRole("dialog", { name: "New task" });
    await dialog.getByLabel("Title").fill("Stretch");
    await dialog.getByLabel("Due date").fill("2026-10-16");
    await repeatSelect(dialog).selectOption("daily");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(item(page, "Stretch")).toContainText("Repeats daily");

    await page.getByRole("button", { name: "New task" }).click();
    dialog = page.getByRole("dialog", { name: "New task" });
    await dialog.getByLabel("Title").fill("Pay rent");
    await dialog.getByLabel("Due date").fill("2026-10-31");
    await repeatSelect(dialog).selectOption("monthly");
    await expect(
      dialog.getByText("Repeats on the 31st of every month, or the last day of shorter months."),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(item(page, "Pay rent")).toContainText("Repeats monthly on the 31st");
  });

  test("explains each problem next to its field and keeps the form open", async ({ page }) => {
    await open(page, [task("t1", "Water plants", null)]);

    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });

    // A repeat needs a due date.
    await repeatSelect(dialog).selectOption("weekly");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Choose a due date to start the repeat from.")).toBeVisible();
    await expect(dialog.getByLabel("Due date")).toBeFocused();

    // Selected days need at least one day.
    await dialog.getByLabel("Due date").fill("2026-10-15");
    await repeatSelect(dialog).selectOption("days");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Choose at least one day.")).toBeVisible();
    await expect(dialog.getByRole("checkbox", { name: "Monday" })).toBeFocused();

    // An end date cannot be before the due date.
    await dialog.getByRole("checkbox", { name: "Monday" }).check();
    await dialog.getByLabel("Repeat until (optional)").fill("2026-10-01");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("End date cannot be earlier than the due date.")).toBeVisible();
    await expect(dialog.getByLabel("Repeat until (optional)")).toBeFocused();

    await expect(dialog).toBeVisible();
    await expect(item(page, "Water plants")).not.toContainText("Repeats");

    // Fixing it saves.
    await dialog.getByLabel("Repeat until (optional)").fill("2026-12-01");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(item(page, "Water plants")).toContainText("Repeats Mon until Dec 1, 2026");
  });

  test("a recurring task cannot lose its due date", async ({ page }) => {
    await open(page, [recurring("t1", "Water plants", "2026-10-15", weekly())]);

    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await dialog.getByLabel("Due date").fill("");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Choose a due date to start the repeat from.")).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});

const monthly31 = { kind: "monthly", weekdays: [], dayOfMonth: 31, endDate: null };
const monWedFri = { kind: "days", weekdays: [0, 2, 4], dayOfMonth: null, endDate: null };

/** Click Complete on the series' open occurrence `times` times. */
async function completeRepeatedly(page: Page, title: string, times: number) {
  for (let i = 0; i < times; i++) {
    await page.getByRole("button", { name: `Complete ${title}` }).click();
  }
}

const openOne = (page: Page, title: string) =>
  item(page, title).filter({ hasText: "Status: todo" });

test.describe("completing a recurring task", () => {
  test("a daily task comes back each day, and earlier ones stay completed", async ({ page }) => {
    await open(page, [recurring("a", "Water plants", "2026-10-15", daily())]);

    await completeRepeatedly(page, "Water plants", 3);

    await expect(item(page, "Water plants")).toHaveCount(4);
    await expect(openOne(page, "Water plants")).toHaveCount(1);
    await expect(openOne(page, "Water plants")).toContainText("Due 2026-10-18");
    await expect(item(page, "Water plants").filter({ hasText: "Status: completed" })).toHaveCount(3);
    for (const date of ["2026-10-15", "2026-10-16", "2026-10-17"]) {
      await expect(item(page, "Water plants").filter({ hasText: `Due ${date}` })).toContainText("Status: completed");
    }
  });

  test("a weekly task comes back on the same weekday, and the screen reader is told", async ({ page }) => {
    await open(page, [recurring("a", "Water plants", "2026-10-15", weekly())]);

    await page.getByRole("button", { name: "Complete Water plants" }).click();
    await expect(openOne(page, "Water plants")).toContainText("Due 2026-10-22");
    await expect(
      page.getByText('Completed "Water plants". Next one is due Thursday, October 22, 2026.'),
    ).toBeAttached();

    await page.getByRole("button", { name: "Complete Water plants" }).click();
    await expect(openOne(page, "Water plants")).toContainText("Due 2026-10-29");
  });

  test("a monthly task on the 31st goes through the end of February and back", async ({ page }) => {
    await open(page, [recurring("a", "Pay rent", "2026-01-31", monthly31)]);

    for (const date of ["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]) {
      await page.getByRole("button", { name: "Complete Pay rent" }).click();
      await expect(openOne(page, "Pay rent")).toContainText(`Due ${date}`);
    }
  });

  test("selected days go from Friday to Monday, then Wednesday, then Friday", async ({ page }) => {
    await open(page, [recurring("a", "Gym", "2026-10-16", monWedFri)]);

    for (const date of ["2026-10-19", "2026-10-21", "2026-10-23"]) {
      await page.getByRole("button", { name: "Complete Gym" }).click();
      await expect(openOne(page, "Gym")).toContainText(`Due ${date}`);
    }
  });

  test("a task completed late follows the schedule, not the day it was completed", async ({ page }) => {
    await open(page, [recurring("a", "Water plants", "2026-10-01", daily())]);

    await page.getByRole("button", { name: "Complete Water plants" }).click();

    await expect(openOne(page, "Water plants")).toContainText("Due 2026-10-02");
    await expect(openOne(page, "Water plants")).toContainText("Overdue");
  });

  test("the series ends when the next date is after the end date", async ({ page }) => {
    await open(page, [recurring("a", "Water plants", "2026-10-15", weekly("2026-10-22"))]);

    await page.getByRole("button", { name: "Complete Water plants" }).click();
    await expect(openOne(page, "Water plants")).toContainText("Due 2026-10-22");

    await page.getByRole("button", { name: "Complete Water plants" }).click();
    await expect(page.getByText('Completed "Water plants". That was the last occurrence.')).toBeAttached();
    await expect(item(page, "Water plants")).toHaveCount(2);
    await expect(item(page, "Water plants").filter({ hasText: "Status: completed" })).toHaveCount(2);
    await expect(openOne(page, "Water plants")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Complete Water plants" })).toHaveCount(0);
    await expect(page.getByText(/^Repeats/)).toHaveCount(0);
  });

  test("completing through the form's status field creates the next occurrence once", async ({ page }) => {
    await open(page, [recurring("a", "Water plants", "2026-10-15", weekly())]);

    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await dialog.getByLabel("Status").selectOption("completed");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(item(page, "Water plants")).toHaveCount(2);
    await expect(openOne(page, "Water plants")).toContainText("Due 2026-10-22");
  });

  test("a series survives a reload with exactly one open occurrence", async ({ page }) => {
    await open(page, [recurring("a", "Water plants", "2026-10-15", weekly())]);
    await completeRepeatedly(page, "Water plants", 2);

    await page.reload();

    await expect(item(page, "Water plants")).toHaveCount(3);
    await expect(openOne(page, "Water plants")).toHaveCount(1);
    await expect(openOne(page, "Water plants")).toContainText("Due 2026-10-29");
  });
});

test.describe("US3: editing, stopping and deleting", () => {
  const seeded = () => [recurring("t1", "Water plants", "2026-10-15", weekly())];

  test("one occurrence can differ, then the series can be stopped and its tasks stay", async ({ page }) => {
    await open(page, seeded());

    // Change only this occurrence's title: the next one goes back to the series title.
    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await expect(dialog.getByRole("group", { name: "Apply changes to" })).toBeVisible();
    await expect(repeatSelect(dialog)).toBeDisabled();
    await dialog.getByLabel("Title").fill("Water ferns");
    await dialog.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Complete Water ferns" }).click();
    await expect(page.getByRole("heading", { name: "Water plants" })).toHaveCount(1);

    // Stop the series from the open occurrence.
    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const edit = page.getByRole("dialog", { name: "Edit task" });
    await edit.getByRole("button", { name: "Stop repeating" }).click();
    const confirm = page.getByRole("dialog", { name: "Stop repeating?" });
    await expect(confirm.getByRole("button", { name: "Keep repeating" })).toBeFocused();
    await confirm.getByRole("button", { name: "Stop repeating" }).click();
    await edit.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/^Repeats/)).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(/^Repeats/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Water plants" })).toHaveCount(1);
  });

  test("the entire series can be changed from the open occurrence", async ({ page }) => {
    await open(page, seeded());
    await page.getByRole("button", { name: "Edit Water plants" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await dialog.getByRole("radio", { name: "Entire series" }).check();
    await repeatSelect(dialog).selectOption("daily");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(item(page, "Water plants")).toContainText("Repeats daily");
  });

  test("deleting the open occurrence warns first and ends the series", async ({ page }) => {
    await open(page, seeded());
    await page.getByRole("button", { name: "Delete Water plants" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/This task repeats\. Deleting it also ends the series\./)).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("heading", { name: "Water plants" })).toHaveCount(0);
  });
});

test.describe("US4: repeating tasks on the calendar", () => {
  const series = () => [
    recurring("c1", "Water plants", "2026-10-01", weekly("2026-10-29"), { status: "completed" }),
    recurring("c2", "Water plants", "2026-10-08", weekly("2026-10-29"), { status: "completed" }),
    recurring("t1", "Water plants", "2026-10-15", weekly("2026-10-29")),
  ];
  const previews = (page: Page) => page.getByRole("button", { name: /upcoming/ });

  test("month, week and day views show completed entries, the open one, and previews up to the end date", async ({
    page,
  }) => {
    await open(page, series());
    await page.getByRole("button", { name: "Calendar", exact: true }).click();

    // Month: 22 and 29 October are previews, and nothing is drawn after the end date.
    await expect(previews(page)).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Water plants, medium priority, completed, repeats" })).toHaveCount(2);

    await page.getByRole("group", { name: "Calendar view" }).getByRole("button", { name: "Week" }).click();
    await expect(page.getByRole("button", { name: "Water plants, medium priority, repeats" })).toHaveCount(1);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(previews(page)).toHaveCount(1);

    await page.getByRole("group", { name: "Calendar view" }).getByRole("button", { name: "Day" }).click();
    await page.getByRole("button", { name: "Today" }).click();
    await expect(previews(page)).toHaveCount(0);
  });

  test("a preview opens the open occurrence, and cannot be moved", async ({ page }) => {
    await open(page, series());
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    // Only the three real entries (two completed, one open) can be moved, not the two previews.
    await expect(page.getByRole("button", { name: /^Move Water plants/ })).toHaveCount(3);
    const preview = previews(page).first();
    await expect(preview.locator("xpath=ancestor::li")).not.toHaveAttribute("draggable", "true");

    await preview.click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await expect(dialog.getByLabel("Due date")).toHaveValue("2026-10-15");
  });

  test("moving the open occurrence moves the previews, and a filter hides them", async ({ page }) => {
    await open(page, series());
    await page.getByRole("button", { name: "Calendar", exact: true }).click();

    await page.getByRole("button", { name: "Water plants, medium priority, repeats", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Due date").fill("2026-10-20");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    // The weekly Thursday rule still gives the 22nd and the 29th, both inside the end date.
    await expect(previews(page)).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Water plants, medium priority, repeats", exact: true })).toBeVisible();

    await page.getByRole("searchbox", { name: "Search" }).fill("zzz");
    await expect(previews(page)).toHaveCount(0);
  });
});

test.describe("keyboard, speed and narrow windows", () => {
  test("a repeat can be set, completed, edited as a series, and stopped using only the keyboard", async ({
    page,
  }) => {
    await open(page, [task("t1", "Water plants", "2026-10-15")]);
    const focusRing = async () =>
      expect(
        await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;
          const style = getComputedStyle(el);
          return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
        }),
      ).toBe(true);

    // Reach the Edit button with Tab alone.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
      if (name === "Edit Water plants") break;
    }
    await focusRing();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await repeatSelect(dialog).focus();
    await focusRing();
    await page.keyboard.press("ArrowDown"); // Daily
    await page.keyboard.press("ArrowDown"); // Weekly
    await expect(repeatSelect(dialog)).toHaveValue("weekly");
    await dialog.getByRole("button", { name: "Save" }).focus();
    await focusRing();
    await page.keyboard.press("Enter");
    await expect(item(page, "Water plants")).toContainText("Repeats weekly on Thursday");

    // Complete it with the keyboard.
    await page.getByRole("button", { name: "Complete Water plants" }).focus();
    await focusRing();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Water plants" })).toHaveCount(2);

    // Edit the series and stop it.
    await page.getByRole("button", { name: "Edit Water plants" }).first().focus();
    await page.keyboard.press("Enter");
    const edit = page.getByRole("dialog", { name: "Edit task" });
    const series = edit.getByRole("radio", { name: "Entire series" });
    await edit.getByRole("radio", { name: "This occurrence only" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(series).toBeChecked();
    await edit.getByRole("button", { name: "Stop repeating" }).focus();
    await focusRing();
    await page.keyboard.press("Enter");
    const confirm = page.getByRole("dialog", { name: "Stop repeating?" });
    await expect(confirm.getByRole("button", { name: "Keep repeating" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(repeatSelect(edit)).toHaveValue("none");
  });

  test("with 500 tasks including 100 series, switching calendar views and months stays under 1 second", async ({
    page,
  }) => {
    const many = Array.from({ length: 500 }, (_, i) => {
      const day = String(1 + (i % 28)).padStart(2, "0");
      const base = task(`s${i}`, `Task number ${i}`, `2026-10-${day}`);
      return i < 100
        ? recurring(`s${i}`, `Series ${i}`, `2026-10-${day}`, i % 2 ? daily() : weekly(), { seriesId: `series-${i}` })
        : base;
    });
    await open(page, many);

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
    for (const label of ["Next", "Week", "Day", "Month", "Previous"]) {
      expect(await timed(label), label).toBeLessThan(1000);
    }
  });
});
