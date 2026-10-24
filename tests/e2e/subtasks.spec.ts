import { expect, test, type Page } from "@playwright/test";

const stamp = "2026-10-01T00:00:00.000Z";
const NOW = new Date(2026, 9, 15, 10, 0, 0);

function task(id: string, title: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title,
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    tags: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function sub(id: string, title: string, overrides: Record<string, unknown> = {}) {
  return { id, title, priority: "medium", dueDate: null, done: false, ...overrides };
}

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

const dialog = (page: Page) => page.getByRole("dialog", { name: /^Subtasks:/ });
const titles = (page: Page) => dialog(page).locator(".subtask-title");
const openSubtasks = (page: Page, title = "Plan launch") =>
  page.getByRole("button", { name: `Subtasks for ${title}` }).click();

test.describe("US1: add subtasks", () => {
  test("three subtasks are added with Enter, shown in the list, and survive a reload", async ({ page }) => {
    await open(page, [task("t1", "Plan launch")]);
    await openSubtasks(page);
    await dialog(page).getByLabel("New subtask").fill("Draft");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Review");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Ship");
    await page.keyboard.press("Enter");
    await expect(titles(page)).toHaveText(["Draft", "Review", "Ship"]);
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("0 of 3 subtasks complete")).toBeVisible();

    await page.reload();
    await expect(page.getByText("0 of 3 subtasks complete")).toBeVisible();
    await openSubtasks(page);
    await expect(titles(page)).toHaveText(["Draft", "Review", "Ship"]);
  });

  test("a blank title is refused with a message", async ({ page }) => {
    await open(page, [task("t1", "Plan launch")]);
    await openSubtasks(page);
    await page.keyboard.press("Enter");
    await expect(dialog(page).getByText("Title is required.")).toBeVisible();
  });
});

test.describe("US2: complete and the prompt", () => {
  test("progress goes 1, 2, 3 of 3 with the task open; the prompt is optional", async ({ page }) => {
    await open(page, [task("t1", "Plan launch", { subtasks: [sub("a", "A"), sub("b", "B"), sub("c", "C")] })]);
    await openSubtasks(page);
    for (const [name, text] of [["A", "1 of 3"], ["B", "2 of 3"]] as const) {
      await dialog(page).getByRole("checkbox", { name }).check();
      await expect(dialog(page).locator(".subtasks-summary")).toHaveText(`${text} subtasks complete`);
    }
    await expect(page.getByRole("dialog", { name: "Complete task?" })).toHaveCount(0);
    await dialog(page).getByRole("checkbox", { name: "C" }).check();

    const prompt = page.getByRole("dialog", { name: "Complete task?" });
    await expect(prompt.getByRole("button", { name: "Leave open" })).toBeFocused();
    await prompt.getByRole("button", { name: "Leave open" }).click();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Status: todo")).toBeVisible();

    await openSubtasks(page);
    await dialog(page).getByRole("checkbox", { name: "C" }).uncheck();
    await dialog(page).getByRole("checkbox", { name: "C" }).check();
    await page.getByRole("dialog", { name: "Complete task?" }).getByRole("button", { name: "Complete task" }).click();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Status: completed")).toBeVisible();
    await expect(page.getByText("3 of 3 subtasks complete")).toBeVisible();
  });
});

test.describe("US3: completing the parent", () => {
  test("the Complete button completes subtasks; reopening leaves them; repeats get a fresh copy", async ({ page }) => {
    const weekly = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: null };
    await open(page, [
      task("t1", "Plan launch", { subtasks: [sub("a", "A", { done: true }), sub("b", "B"), sub("c", "C")] }),
      task("t2", "Weekly review", {
        dueDate: "2026-10-15",
        recurrence: weekly,
        seriesId: "s1",
        subtasks: [sub("x", "X"), sub("y", "Y")],
      }),
    ]);
    await page.getByRole("button", { name: "Complete Plan launch" }).click();
    await expect(page.getByText("3 of 3 subtasks complete")).toBeVisible();

    await page.getByRole("button", { name: "Edit Plan launch" }).click();
    await page.getByRole("dialog").getByLabel("Status").selectOption("todo");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("3 of 3 subtasks complete")).toBeVisible();

    await openSubtasks(page, "Weekly review");
    await dialog(page).getByRole("checkbox", { name: "X" }).check();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Complete Weekly review" }).click();
    await expect(page.getByText("2 of 2 subtasks complete")).toBeVisible();
    await expect(page.getByText("0 of 2 subtasks complete")).toBeVisible();
  });

  test("deleting a parent names its subtasks", async ({ page }) => {
    await open(page, [task("t1", "Plan launch", { subtasks: [sub("a", "A"), sub("b", "B")] })]);
    await page.getByRole("button", { name: "Delete Plan launch" }).click();
    await expect(page.getByText(/Its 2 subtasks will be deleted too\./)).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("heading", { name: "Plan launch" })).toHaveCount(0);
  });
});

test.describe("US4: edit, reorder, delete", () => {
  test("edit, cancel, reorder, delete, tags follow the parent, and it all survives a reload", async ({ page }) => {
    await open(page, [
      task("t1", "Plan launch", { tags: ["work"], subtasks: [sub("a", "A"), sub("b", "B"), sub("c", "C")] }),
    ]);
    await openSubtasks(page);
    await expect(dialog(page).getByText("work")).toHaveCount(3);

    await dialog(page).getByRole("button", { name: "Edit B" }).click();
    await dialog(page).getByLabel("Subtask title").fill("B2");
    await dialog(page).getByLabel("Priority").selectOption("high");
    await dialog(page).getByLabel("Due date (optional)").fill("2026-10-10");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(dialog(page).getByText("Overdue")).toBeVisible();

    await dialog(page).getByRole("button", { name: "Edit A" }).click();
    await dialog(page).getByLabel("Subtask title").fill("zzz");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeVisible();

    await dialog(page).getByRole("button", { name: "Move C up" }).click();
    await dialog(page).getByRole("button", { name: "Move C up" }).click();
    await expect(titles(page)).toHaveText(["C", "A", "B2"]);
    await dialog(page).getByRole("button", { name: "Delete A" }).click();
    await expect(titles(page)).toHaveText(["C", "B2"]);

    await page.reload();
    await openSubtasks(page);
    await expect(titles(page)).toHaveText(["C", "B2"]);
  });

  test("everything works with the keyboard alone, with a visible focus indicator", async ({ page }) => {
    await open(page, [task("t1", "Plan launch", { subtasks: [sub("a", "A"), sub("b", "B")] })]);
    const ring = async () =>
      expect(
        await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;
          const style = getComputedStyle(el);
          return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
        }),
      ).toBe(true);

    await page.getByRole("button", { name: "Subtasks for Plan launch" }).focus();
    await ring();
    await page.keyboard.press("Enter");
    await expect(dialog(page).getByLabel("New subtask")).toBeFocused();
    await page.keyboard.type("C");
    await page.keyboard.press("Enter");
    await expect(titles(page)).toHaveText(["A", "B", "C"]);

    await dialog(page).getByRole("button", { name: "Edit C" }).focus();
    await ring();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("C2");
    await page.keyboard.press("Enter");
    await expect(titles(page).nth(2)).toHaveText("C2");

    await dialog(page).getByRole("button", { name: "Move C2 up" }).focus();
    await page.keyboard.press("Enter");
    await expect(titles(page)).toHaveText(["A", "C2", "B"]);

    for (const name of ["A", "C2", "B"]) {
      await dialog(page).getByRole("checkbox", { name }).focus();
      await page.keyboard.press("Space");
    }
    const prompt = page.getByRole("dialog", { name: "Complete task?" });
    await expect(prompt.getByRole("button", { name: "Leave open" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Complete task?" })).toHaveCount(0);

    await dialog(page).getByRole("button", { name: "Delete B" }).focus();
    await page.keyboard.press("Enter");
    await expect(titles(page)).toHaveText(["A", "C2"]);
  });
});

test.describe("speed", () => {
  test("with 500 tasks, 100 with 10 subtasks, the list renders and filtering is under 1 second", async ({ page }) => {
    const many = Array.from({ length: 500 }, (_, i) =>
      task(
        `s${i}`,
        `Task number ${i}`,
        i < 100 ? { subtasks: Array.from({ length: 10 }, (_, j) => sub(`s${i}-${j}`, `Step ${j}`, { done: j < 4 })) } : {},
      ),
    );
    await open(page, many);
    await expect(page.getByText("4 of 10 subtasks complete").first()).toBeVisible();
    const elapsed = await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>("input[type=search]");
      if (!input) throw new Error("no search box");
      const start = performance.now();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "number 4");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return performance.now() - start;
    });
    expect(elapsed).toBeLessThan(1000);
  });
});
