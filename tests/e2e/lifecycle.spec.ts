import { expect, test, type Page } from "@playwright/test";

async function addTask(page: Page, title: string) {
  await page.getByRole("button", { name: "New task" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Save" }).click();
}

const item = (page: Page, title: string) =>
  page.getByRole("listitem").filter({ hasText: title });

test("edit, complete, and delete persist across a reload", async ({ page }) => {
  await page.goto("/");
  await addTask(page, "Edit me");
  await addTask(page, "Finish me");
  await addTask(page, "Delete me");
  await addTask(page, "Keep me");

  await page.getByRole("button", { name: "Edit Edit me" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Title")).toHaveValue("Edit me");
  await dialog.getByLabel("Title").fill("Edited");
  await dialog.getByLabel("Priority").selectOption("low");
  await dialog.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "Complete Finish me" }).click();

  // Cancelled delete keeps the task.
  await page.getByRole("button", { name: "Delete Keep me" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(item(page, "Keep me")).toBeVisible();

  // Confirmed delete removes it.
  await page.getByRole("button", { name: "Delete Delete me" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(item(page, "Delete me")).toHaveCount(0);

  await page.reload();

  await expect(item(page, "Edited")).toContainText("Priority: low");
  await expect(item(page, "Edit me")).toHaveCount(0);
  await expect(item(page, "Finish me")).toContainText("Status: completed");
  await expect(item(page, "Delete me")).toHaveCount(0);
  await expect(item(page, "Keep me")).toBeVisible();
});
