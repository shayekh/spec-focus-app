import { expect, test } from "@playwright/test";

const stamp = "2026-10-01T00:00:00.000Z";

function seed(priority: string) {
  return {
    version: 1,
    tasks: [
      {
        id: "1",
        title: "Styled task",
        description: "",
        priority,
        status: "todo",
        dueDate: null,
        tags: [],
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
  };
}

test("buttons give hover feedback with a short transition", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Export" });
  const before = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  const duration = await button.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(parseFloat(duration)).toBeGreaterThan(0);
  expect(parseFloat(duration)).toBeLessThanOrEqual(0.3);

  await button.hover();
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(before);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("removes transitions", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Export" });
    const duration = await button.evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(duration)).toBe(0);
  });
});

test("Clear filters looks and behaves disabled until a filter is active", async ({ page }) => {
  await page.addInitScript((doc) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
  }, seed("medium"));
  await page.goto("/");

  const clear = page
    .getByRole("region", { name: "Filter and search tasks" })
    .getByRole("button", { name: "Clear filters" });
  await expect(clear).toBeDisabled();
  const disabledOpacity = await clear.evaluate((el) => getComputedStyle(el).opacity);
  expect(parseFloat(disabledOpacity)).toBeLessThan(1);
  expect(await clear.evaluate((el) => getComputedStyle(el).cursor)).toBe("not-allowed");

  await page.getByRole("combobox", { name: "Priority", exact: true }).selectOption("high");
  await expect(clear).toBeEnabled();
  expect(await clear.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("priority badges use a different cue color for each priority", async ({ browser }) => {
  const colors: string[] = [];
  for (const priority of ["low", "medium", "high"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript((doc) => {
      localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
    }, seed(priority));
    await page.goto("/");
    const badge = page.getByText(`Priority: ${priority}`);
    await expect(badge).toBeVisible();
    colors.push(await badge.evaluate((el) => getComputedStyle(el, "::before").backgroundColor));
    await context.close();
  }
  expect(new Set(colors).size).toBe(3);
  for (const color of colors) expect(color).not.toBe("rgba(0, 0, 0, 0)");
});

test("the empty state button opens the new task form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add your first task" }).click();
  await expect(page.getByRole("dialog", { name: "New task" })).toBeVisible();
});

test("Delete in the list is outlined while the confirm button stays solid", async ({ page }) => {
  await page.addInitScript((doc) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
  }, seed("medium"));
  await page.goto("/");

  const rowDelete = page.getByRole("button", { name: "Delete Styled task" });
  const rowBackground = await rowDelete.evaluate((el) => getComputedStyle(el).backgroundColor);
  await rowDelete.click();

  const confirm = page.getByRole("dialog").getByRole("button", { name: "Delete" });
  const confirmBackground = await confirm.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(rowBackground).not.toBe(confirmBackground);
});
