import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("export, clear data, then import restores the tasks", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New task" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Back me up");
  await dialog.getByLabel("Priority").selectOption("high");
  await dialog.getByLabel("Due date").fill("2030-03-04");
  await dialog.getByLabel("Tags").fill("keep, safe");
  await dialog.getByRole("button", { name: "Save" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^focus-app-tasks-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  expect(JSON.parse(await readFile(path, "utf8")).tasks).toHaveLength(1);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("No tasks yet")).toBeVisible();

  await page.getByLabel("Import tasks").setInputFiles(path);

  const item = page.getByRole("listitem").filter({ hasText: "Back me up" });
  await expect(item).toContainText("Priority: high");
  await expect(item).toContainText("Due 2030-03-04");
  await expect(item).toContainText("keep");
  await expect(item).toContainText("safe");
});
