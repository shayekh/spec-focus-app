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
