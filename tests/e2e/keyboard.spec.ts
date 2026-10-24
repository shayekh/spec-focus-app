import { expect, test, type Page } from "@playwright/test";

/** Accessible-ish name of the focused element: aria-label, label text, or own text. */
async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "";
    const aria = el.getAttribute("aria-label");
    if (aria) return aria;
    const label = (el as HTMLInputElement).labels?.[0];
    if (label?.firstChild?.textContent) return label.firstChild.textContent.trim();
    return (el.textContent ?? "").trim();
  });
}

async function hasVisibleFocus(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  });
}

/** Press Tab until the focused element's name starts with `name`; never touches the mouse. */
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

const headings = (page: Page) => page.getByRole("heading", { level: 3 }).allTextContents();

test("every task action works with the keyboard alone", async ({ page }) => {
  await page.goto("/");

  // Create two tasks, reaching every field and the Save button by Tab.
  for (const title of ["Keyboard task", "Second task"]) {
    await tabTo(page, "New task");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.type(title);
    await tabTo(page, "Priority");
    await page.keyboard.type("high");
    await tabTo(page, "Save");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(await headings(page)).toEqual(["Second task", "Keyboard task"]);

  // Escape closes a dialog and returns focus to the control that opened it.
  await tabTo(page, "New task");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await focusedName(page)).toBe("New task");

  // Edit.
  await tabTo(page, "Edit Keyboard task");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Edited by keyboard");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 3, name: "Edited by keyboard" })).toBeVisible();

  // Complete.
  await tabTo(page, "Complete Second task");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listitem").filter({ hasText: "Second task" })).toContainText(
    "Status: completed",
  );

  // Delete: focus starts on Cancel, Tab moves to the confirm button.
  await tabTo(page, "Delete Second task");
  await page.keyboard.press("Enter");
  expect(await focusedName(page)).toBe("Cancel");
  await page.keyboard.press("Tab");
  expect(await focusedName(page)).toBe("Delete");
  await page.keyboard.press("Enter");
  expect(await headings(page)).toEqual(["Edited by keyboard"]);

  // Search, filter, and sort.
  await tabTo(page, "Search");
  await page.keyboard.type("keyboard");
  expect(await headings(page)).toEqual(["Edited by keyboard"]);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("zzz");
  await expect(page.getByText("No tasks match your filters.")).toBeVisible();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");

  await tabTo(page, "Status");
  await page.keyboard.type("completed");
  await expect(page.getByText("No tasks match your filters.")).toBeVisible();
  await tabTo(page, "Clear filters");
  await page.keyboard.press("Enter");
  expect(await headings(page)).toEqual(["Edited by keyboard"]);

  await tabTo(page, "Sort by");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("combobox", { name: "Sort by", exact: true })).toHaveValue("dueDate");

  // Theme toggle with Space.
  await tabTo(page, "Dark theme");
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Export.
  await tabTo(page, "Export");
  const downloadPromise = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  await downloadPromise;
});
