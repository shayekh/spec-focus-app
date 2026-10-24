import { expect, test, type Page } from "@playwright/test";

const longWord = "Supercalifragilistic".repeat(15);

function seedDoc() {
  const stamp = "2026-10-01T00:00:00.000Z";
  return {
    version: 1,
    tasks: [
      {
        id: "long-1",
        title: longWord,
        description: `${longWord} ${"words ".repeat(200)}`,
        priority: "high",
        status: "todo",
        dueDate: "2020-01-01",
        tags: Array.from({ length: 40 }, (_, i) => `tag-number-${i}`),
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
  };
}

async function noHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "narrow", width: 375, height: 700 },
]) {
  test(`long content does not break the layout (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript((doc) => {
      localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
    }, seedDoc());
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    // Core controls stay reachable at this width.
    await expect(page.getByRole("button", { name: "New task" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Edit /})).toBeVisible();

    // The form dialog also fits.
    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Save" })).toBeInViewport();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
}

test("the task modal keeps Save and Close reachable in a short, narrow window with long content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 420 });
  await page.addInitScript((doc) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
  }, seedDoc());
  await page.goto("/");

  await page.getByRole("button", { name: /^Edit /}).click();
  const dialog = page.getByRole("dialog", { name: "Edit task" });
  await expect(dialog).toBeVisible();

  // The form is taller than the window, yet the controls that end the session stay on screen.
  const taller = await dialog.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(taller).toBe(true);
  await expect(dialog.getByRole("button", { name: "Save" })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeInViewport();

  // The dialog fits the window and the page does not scroll sideways.
  const box = await dialog.boundingBox();
  expect(box?.width ?? 0).toBeLessThanOrEqual(375);
  expect(await noHorizontalScroll(page)).toBe(true);

  // The Close button does not sit on top of the heading text (measure the text, not the padded box).
  const textRight = await dialog
    .getByRole("heading", { name: "Edit task" })
    .evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().right;
    });
  const close = await dialog.getByRole("button", { name: "Close" }).boundingBox();
  if (!close) throw new Error("close button not visible");
  expect(textRight).toBeLessThanOrEqual(close.x);
});

test("the calendar fits a narrow window: the grid scrolls inside itself and the controls stay reachable", async ({
  page,
}) => {
  const stamp = "2026-10-01T00:00:00.000Z";
  const make = (id: string, title: string, dueDate: string) => ({
    id,
    title,
    description: "",
    priority: "medium",
    status: "todo",
    dueDate,
    tags: [],
    createdAt: stamp,
    updatedAt: stamp,
  });
  const doc = {
    version: 1,
    tasks: [
      make("long", `${longWord} ${longWord}`, "2026-10-15"),
      ...["a", "b", "c", "d", "e"].map((id) => make(id, `Crowded task ${id}`, "2026-10-21")),
    ],
  };

  await page.setViewportSize({ width: 375, height: 700 });
  await page.clock.setFixedTime(new Date(2026, 9, 15, 10, 0, 0));
  await page.addInitScript((d) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(d));
  }, doc);
  await page.goto("/");
  await page.getByRole("button", { name: "Calendar" }).click();

  for (const view of ["Month", "Week", "Day"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    expect(await noHorizontalScroll(page), `${view}: page must not scroll sideways`).toBe(true);
    for (const name of ["Previous", "Today", "Next", "Month", "Week", "Day"]) {
      await expect(page.getByRole("button", { name, exact: true }), `${view}: ${name}`).toBeInViewport();
    }
  }

  // In the month view the grid keeps a readable width and scrolls inside its own container.
  await page.getByRole("button", { name: "Month", exact: true }).click();
  const scroller = page.locator(".calendar-scroll");
  expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  const [cellWidth] = await page.locator("tbody td").evaluateAll((cells) => cells.map((c) => c.getBoundingClientRect().width));
  expect(cellWidth ?? 0).toBeGreaterThanOrEqual(80);

  // Long titles are cut off inside their cell, with the full title still available.
  const longEntry = page.getByRole("button", { name: /^Supercalifragilistic/ });
  await expect(longEntry).toHaveAttribute("title", `${longWord} ${longWord}`);
  const fits = await longEntry.evaluate((el) => {
    const cell = el.closest("td");
    return cell ? el.getBoundingClientRect().right <= cell.getBoundingClientRect().right + 1 : false;
  });
  expect(fits).toBe(true);
});

test("the Repeat section and calendar previews fit a 375px window without sideways scrolling", async ({ page }) => {
  const stamp = "2026-10-01T00:00:00.000Z";
  const doc = {
    version: 1,
    tasks: [
      {
        id: "r1",
        title: `${longWord} ${longWord}`,
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: "2026-10-15",
        tags: [],
        createdAt: stamp,
        updatedAt: stamp,
        recurrence: { kind: "days", weekdays: [0, 1, 2, 3, 4, 5, 6], dayOfMonth: null, endDate: "2026-12-31" },
        seriesId: "s1",
        seriesTemplate: { title: `${longWord} ${longWord}`, description: "", priority: "medium", tags: [] },
      },
    ],
  };
  await page.setViewportSize({ width: 375, height: 700 });
  await page.clock.setFixedTime(new Date(2026, 9, 15, 10, 0, 0));
  await page.addInitScript((d) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(d));
  }, doc);
  await page.goto("/");

  expect(await noHorizontalScroll(page), "list").toBe(true);
  await page.getByRole("button", { name: /^Edit / }).click();
  const dialog = page.getByRole("dialog", { name: "Edit task" });
  await expect(dialog.getByRole("group", { name: "Repeat settings" })).toBeVisible();
  expect(await noHorizontalScroll(page), "form").toBe(true);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  for (const view of ["Month", "Week", "Day"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    expect(await noHorizontalScroll(page), `${view} with previews`).toBe(true);
  }
});

test("subtasks fit a 375px window: the list item, the dialog with long titles, edit mode, and the prompt", async ({ page }) => {
  const stamp = "2026-10-01T00:00:00.000Z";
  const long = `${longWord} ${longWord}`;
  const doc = {
    version: 1,
    tasks: [
      {
        id: "p1",
        title: long,
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: null,
        tags: ["a-tag", "another-tag"],
        createdAt: stamp,
        updatedAt: stamp,
        subtasks: [
          { id: "a", title: long, priority: "high", dueDate: "2026-10-01", done: false },
          { id: "b", title: "Short", priority: "low", dueDate: null, done: true },
        ],
      },
    ],
  };
  await page.setViewportSize({ width: 375, height: 700 });
  await page.clock.setFixedTime(new Date(2026, 9, 15, 10, 0, 0));
  await page.addInitScript((d) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(d));
  }, doc);
  await page.goto("/");
  expect(await noHorizontalScroll(page), "list").toBe(true);

  await page.getByRole("button", { name: /^Subtasks for / }).click();
  const dialog = page.getByRole("dialog", { name: /^Subtasks:/ });
  expect(await noHorizontalScroll(page), "dialog").toBe(true);
  await expect(dialog.getByRole("button", { name: "Close" })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Add subtask" })).toBeInViewport();

  await dialog.getByRole("button", { name: /^Edit Super/ }).click();
  expect(await noHorizontalScroll(page), "edit mode").toBe(true);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await dialog.getByRole("checkbox", { name: /^Super/ }).check();
  const prompt = page.getByRole("dialog", { name: "Complete task?" });
  await expect(prompt.getByRole("button", { name: "Complete task" })).toBeInViewport();
  expect(await noHorizontalScroll(page), "prompt").toBe(true);
});
