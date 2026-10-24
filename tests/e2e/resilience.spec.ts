import { expect, test } from "@playwright/test";

test("unreadable stored data opens an empty app with a notice and stays usable", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("focus-app:tasks", "{this is not json");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText("could not be read");
  await expect(page.getByText("No tasks yet")).toBeVisible();

  await page.getByRole("button", { name: "New task" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill("Fresh start");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Fresh start" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: "Fresh start" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
