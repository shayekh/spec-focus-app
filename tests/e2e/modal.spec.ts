import { expect, test, type Page } from "@playwright/test";

const stamp = "2026-10-01T00:00:00.000Z";

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

async function seed(page: Page, tasks: unknown[]) {
  await page.addInitScript((doc) => {
    if (!localStorage.getItem("focus-app:tasks")) {
      localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
    }
  }, { version: 1, tasks });
}

const headings = (page: Page) => page.getByRole("heading", { level: 3 }).allTextContents();

test.describe("add a task in a modal", () => {
  test("New task opens a modal over the list with defaults, and a valid save lists the task", async ({
    page,
  }) => {
    await seed(page, [task("1", "Existing")]);
    await page.goto("/");

    await page.getByRole("button", { name: "New task" }).click();
    const dialog = page.getByRole("dialog", { name: "New task" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Priority")).toHaveValue("medium");
    await expect(dialog.getByLabel("Status")).toHaveValue("todo");
    await expect(dialog.getByLabel("Title")).toBeFocused();
    // The list is still on the page underneath, not replaced by the form.
    await expect(page.getByRole("heading", { level: 3, name: "Existing" })).toBeAttached();

    await dialog.getByLabel("Title").fill("Brand new task");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toHaveCount(0);
    expect(await headings(page)).toEqual(["Brand new task", "Existing"]);
  });

  test("an empty title keeps the modal open and explains why", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add your first task" }).click();
    const dialog = page.getByRole("dialog", { name: "New task" });

    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Title is required.")).toBeVisible();
    await expect(dialog.getByLabel("Title")).toBeFocused();
    await expect(page.getByText("No tasks yet")).toBeAttached();
  });

  test("submitting the form twice in the same instant creates one task", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add your first task" }).click();
    const dialog = page.getByRole("dialog", { name: "New task" });
    await dialog.getByLabel("Title").fill("Only once");

    // Two submissions before the page can react, like a double click on Save.
    await page.evaluate(() => {
      const form = document.querySelector('[role="dialog"] form');
      if (!(form instanceof HTMLFormElement)) throw new Error("form not found");
      form.requestSubmit();
      form.requestSubmit();
    });

    await expect(dialog).toHaveCount(0);
    expect(await headings(page)).toEqual(["Only once"]);
  });
});

test.describe("edit a task in the same modal", () => {
  const full = task("t1", "Plan trip", {
    description: "Flights and hotel",
    priority: "high",
    status: "in-progress",
    dueDate: "2030-12-01",
    tags: ["travel", "personal"],
  });

  test("opens the same dialog pre-filled, and a saved change shows in the list", async ({ page }) => {
    await seed(page, [full]);
    await page.goto("/");

    await page.getByRole("button", { name: "New task" }).click();
    const addDialog = page.getByRole("dialog", { name: "New task" });
    const addControls = await addDialog.locator("input, select, textarea").count();
    await page.keyboard.press("Escape");
    await expect(addDialog).toHaveCount(0);

    await page.getByRole("button", { name: "Edit Plan trip" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await expect(dialog.getByLabel("Title")).toHaveValue("Plan trip");
    await expect(dialog.getByLabel("Description")).toHaveValue("Flights and hotel");
    await expect(dialog.getByLabel("Priority")).toHaveValue("high");
    await expect(dialog.getByLabel("Status")).toHaveValue("in-progress");
    await expect(dialog.getByLabel("Due date")).toHaveValue("2030-12-01");
    await expect(dialog.getByLabel("Tags")).toHaveValue("travel, personal");
    expect(await dialog.locator("input, select, textarea").count()).toBe(addControls);

    await dialog.getByLabel("Title").fill("Plan holiday");
    await dialog.getByLabel("Priority").selectOption("low");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toHaveCount(0);
    const item = page.getByRole("listitem").filter({ hasText: "Plan holiday" });
    await expect(item).toContainText("Priority: low");
  });

  test("a task deleted in another tab cannot be saved, and the modal says so", async ({ context }) => {
    await context.addInitScript((doc) => {
      if (!localStorage.getItem("focus-app:tasks")) {
        localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
      }
    }, { version: 1, tasks: [full] });
    const editing = await context.newPage();
    const other = await context.newPage();
    await editing.goto("/");
    await other.goto("/");

    await editing.getByRole("button", { name: "Edit Plan trip" }).click();
    const dialog = editing.getByRole("dialog", { name: "Edit task" });
    await dialog.getByLabel("Title").fill("Plan trip (edited)");

    await other.getByRole("button", { name: "Delete Plan trip" }).click();
    await other.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(other.getByRole("heading", { level: 3 })).toHaveCount(0);
    await expect(editing.getByRole("heading", { level: 3 })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toHaveText(
      "This task no longer exists, so your changes cannot be saved.",
    );
    await expect(dialog.getByLabel("Title")).toHaveValue("Plan trip (edited)");
    await expect(editing.getByRole("heading", { level: 3 })).toHaveCount(0);
  });
});

test.describe("cancel or close without losing work by accident", () => {
  async function openNew(page: Page) {
    await seed(page, [task("1", "Existing")]);
    await page.goto("/");
    await page.getByRole("button", { name: "New task" }).click();
    return page.getByRole("dialog", { name: "New task" });
  }

  const routes: [string, (page: Page) => Promise<void>][] = [
    ["Cancel", (page) => page.getByRole("button", { name: "Cancel" }).click()],
    ["the Close button", (page) => page.getByRole("button", { name: "Close" }).click()],
    ["Escape", (page) => page.keyboard.press("Escape")],
  ];

  for (const [name, close] of routes) {
    test(`${name} closes a clean form immediately`, async ({ page }) => {
      const dialog = await openNew(page);
      await close(page);
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test(`${name} asks before discarding changes; Keep editing keeps them`, async ({ page }) => {
      const dialog = await openNew(page);
      await dialog.getByLabel("Title").fill("Half-written");
      await close(page);

      const confirm = page.getByRole("dialog", { name: "Discard changes?" });
      await expect(confirm).toBeVisible();
      await expect(confirm.getByRole("button", { name: "Keep editing" })).toBeFocused();
      await confirm.getByRole("button", { name: "Keep editing" }).click();

      await expect(confirm).toHaveCount(0);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel("Title")).toHaveValue("Half-written");
    });

    test(`${name} then Discard closes both dialogs and leaves the list unchanged`, async ({ page }) => {
      const dialog = await openNew(page);
      await dialog.getByLabel("Title").fill("Half-written");
      await close(page);
      await page.getByRole("dialog", { name: "Discard changes?" }).getByRole("button", { name: "Discard" }).click();

      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(await headings(page)).toEqual(["Existing"]);
    });
  }

  test("a change that is reverted counts as no change", async ({ page }) => {
    const dialog = await openNew(page);
    await dialog.getByLabel("Title").fill("abc");
    await dialog.getByLabel("Title").fill("");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("editing: only a real change asks for confirmation", async ({ page }) => {
    await seed(page, [task("t1", "Plan trip", { tags: ["a"] })]);
    await page.goto("/");

    await page.getByRole("button", { name: "Edit Plan trip" }).click();
    await page.getByRole("dialog", { name: "Edit task" }).getByLabel("Title").fill("  Plan trip ");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Edit Plan trip" }).click();
    await page.getByRole("dialog", { name: "Edit task" }).getByLabel("Priority").selectOption("high");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Discard changes?" })).toBeVisible();
  });

  test("clicking the dimmed area does nothing, with or without changes", async ({ page }) => {
    const dialog = await openNew(page);
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Title").fill("keep me");
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Discard changes?" })).toHaveCount(0);
    await expect(dialog.getByLabel("Title")).toHaveValue("keep me");
    // Focus stays in the dialog, so Escape still works.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Discard changes?" })).toBeVisible();
  });
});

/** Name of the focused element: aria-label, wrapping label text, or its own text. */
async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return "";
    const aria = el.getAttribute("aria-label");
    if (aria) return aria;
    const label = el instanceof HTMLInputElement ? el.labels?.[0] : undefined;
    if (label?.firstChild?.textContent) return label.firstChild.textContent.trim();
    return (el.textContent ?? "").trim();
  });
}

/** Names of everything the browser exposes to assistive technology (inert content is excluded). */
async function accessibleNames(page: Page): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    return nodes.filter((node) => !node.ignored).map((node) => String(node.name?.value ?? ""));
  } finally {
    await cdp.detach();
  }
}

async function focusIsInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const active = document.activeElement;
    return active instanceof Element && active.closest(sel) !== null;
  }, selector);
}

async function hasVisibleFocus(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement) || el === document.body) return false;
    const style = getComputedStyle(el);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  });
}

async function tabTo(page: Page, name: string, maxTabs = 40) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    if ((await focusedName(page)).startsWith(name)) {
      expect(await hasVisibleFocus(page), `focus ring on "${name}"`).toBe(true);
      return;
    }
  }
  throw new Error(`Could not reach "${name}" with the keyboard`);
}

test.describe("the page underneath is unavailable while a modal is open", () => {
  test("pointer clicks and Tab never reach the page, and #root is inert", async ({ page }) => {
    await seed(page, [task("1", "Existing")]);
    await page.goto("/");
    await expect(page.locator("#root")).not.toHaveAttribute("inert");

    // Remember where a page control sits, then open the modal.
    const theme = page.getByRole("button", { name: "Dark theme" });
    const box = await theme.boundingBox();
    if (!box) throw new Error("theme toggle not visible");
    const before = await page.locator("html").getAttribute("data-theme");

    await page.getByRole("button", { name: "New task" }).click();
    const dialog = page.getByRole("dialog", { name: "New task" });
    await expect(page.locator("#root")).toHaveAttribute("inert", "");

    // A click exactly where the control is lands on the dimmed area instead.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator("html")).toHaveAttribute("data-theme", before ?? "light");
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      expect(await focusIsInside(page, '[role="dialog"]'), `Tab #${i + 1}`).toBe(true);
    }
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await focusIsInside(page, '[role="dialog"]'), `Shift+Tab #${i + 1}`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(page.locator("#root")).not.toHaveAttribute("inert");
  });

  test("the page is hidden from assistive technology while the modal is open", async ({ page }) => {
    await seed(page, [task("1", "Existing")]);
    await page.goto("/");
    expect(await accessibleNames(page)).toContain("Export");

    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.getByRole("dialog", { name: "New task" })).toBeVisible();

    // The browser's own accessibility tree no longer includes the page, only the dialog.
    const names = await accessibleNames(page);
    expect(names).not.toContain("Export");
    expect(names).not.toContain("Existing");
    expect(names).toContain("Save");
    expect(names).toContain("Cancel");
  });

  test("with the discard confirmation open, the form is unavailable and Escape closes only the confirmation", async ({
    page,
  }) => {
    await seed(page, [task("1", "Existing")]);
    await page.goto("/");
    await page.getByRole("button", { name: "New task" }).click();
    const form = page.getByRole("dialog", { name: "New task" });
    await form.getByLabel("Title").fill("typed");
    await page.keyboard.press("Escape");

    const confirm = page.getByRole("dialog", { name: "Discard changes?" });
    await expect(confirm).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(2);
    // The form dialog sits inside an inert container, and the browser hides it from assistive technology.
    await expect(page.locator('[inert] [role="dialog"]')).toHaveCount(1);
    const names = await accessibleNames(page);
    expect(names).not.toContain("Save");
    expect(names).toContain("Keep editing");

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      expect(await focusedName(page)).toMatch(/^(Keep editing|Discard)$/);
      expect(await page.evaluate(() => document.activeElement?.closest("[inert]") === null)).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(form).toBeVisible();
    await expect(form.getByLabel("Title")).toHaveValue("typed");
    await expect(page.locator("#root")).toHaveAttribute("inert", "");
  });
});

test.describe("focus returns to the control that opened the modal", () => {
  const closeRoutes: [string, (page: Page) => Promise<void>, boolean][] = [
    ["Save", (page) => page.getByRole("button", { name: "Save" }).click(), true],
    ["Cancel", (page) => page.getByRole("button", { name: "Cancel" }).click(), false],
    ["Close", (page) => page.getByRole("button", { name: "Close" }).click(), false],
    ["Escape", (page) => page.keyboard.press("Escape"), false],
  ];

  for (const [route, close, needsChange] of closeRoutes) {
    test(`after ${route}, from New task`, async ({ page }) => {
      await seed(page, [task("1", "Existing")]);
      await page.goto("/");
      const opener = page.getByRole("button", { name: "New task" });
      await opener.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "New task" });
      if (needsChange) await dialog.getByLabel("Title").fill("Saved task");
      await close(page);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(opener).toBeFocused();
    });

    test(`after ${route}, from an Edit button`, async ({ page }) => {
      await seed(page, [task("1", "Existing")]);
      await page.goto("/");
      const opener = page.getByRole("button", { name: "Edit Existing" });
      await opener.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Edit task" });
      if (needsChange) await dialog.getByLabel("Priority").selectOption("high");
      await close(page);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(opener).toBeFocused();
    });
  }

  test("after a confirmed Discard, from New task and from Edit", async ({ page }) => {
    await seed(page, [task("1", "Existing")]);
    await page.goto("/");

    const newTask = page.getByRole("button", { name: "New task" });
    await newTask.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog", { name: "New task" }).getByLabel("Title").fill("x");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(newTask).toBeFocused();

    const edit = page.getByRole("button", { name: "Edit Existing" });
    await edit.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog", { name: "Edit task" }).getByLabel("Title").fill("changed");
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(edit).toBeFocused();
  });

  test("falls back to New task when the Edit button no longer exists after saving", async ({ page }) => {
    await seed(page, [task("1", "Existing"), task("2", "Other", { status: "in-progress" })]);
    await page.goto("/");
    // Only to-do tasks are listed, so completing "Existing" removes its Edit button.
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("todo");

    await page.getByRole("button", { name: "Edit Existing" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task" });
    await dialog.getByLabel("Status").selectOption("completed");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("button", { name: "Edit Existing" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New task" })).toBeFocused();
  });
});

test.describe("keyboard only", () => {
  test("add, edit, and cancel with and without changes, with no pointer", async ({ page }) => {
    await seed(page, [task("1", "Existing")]);
    await page.goto("/");

    // Add.
    await tabTo(page, "New task");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "New task" })).toBeVisible();
    expect(await focusedName(page)).toBe("Title");
    expect(await hasVisibleFocus(page)).toBe(true);
    await page.keyboard.type("Typed with a keyboard");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await headings(page)).toEqual(["Typed with a keyboard", "Existing"]);

    // Edit.
    await tabTo(page, "Edit Existing");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Edit task" })).toBeVisible();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Existing, renamed");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await headings(page)).toContain("Existing, renamed");

    // Cancel without changes: closes at once, and focus is back on the Edit button.
    await tabTo(page, "Edit Existing, renamed");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Cancel with changes: Keep editing first, then Discard.
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Edit task" })).toBeVisible();
    await page.keyboard.type(" extra");
    await page.keyboard.press("Escape");
    expect(await focusedName(page)).toBe("Keep editing");
    expect(await hasVisibleFocus(page)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Discard changes?" })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Edit task" }).getByLabel("Title")).toHaveValue(
      "Existing, renamed extra",
    );

    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    expect(await focusedName(page)).toBe("Discard");
    expect(await hasVisibleFocus(page)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await headings(page)).toContain("Existing, renamed");
    expect(await headings(page)).not.toContain("Existing, renamed extra");
  });
});

