import { expect, test } from "@playwright/test";

test("created tasks survive a reload", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New task" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Only a title");
  await dialog.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "New task" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Fully specified");
  await dialog.getByLabel("Description").fill("All the fields");
  await dialog.getByLabel("Priority").selectOption("high");
  await dialog.getByLabel("Status").selectOption("in-progress");
  await dialog.getByLabel("Due date").fill("2030-01-15");
  await dialog.getByLabel("Tags").fill("work, urgent");
  await dialog.getByRole("button", { name: "Save" }).click();

  await page.reload();

  const simple = page.getByRole("listitem").filter({ hasText: "Only a title" });
  await expect(simple).toContainText("Priority: medium");
  await expect(simple).toContainText("Status: todo");

  const full = page.getByRole("listitem").filter({ hasText: "Fully specified" });
  await expect(full).toContainText("All the fields");
  await expect(full).toContainText("Priority: high");
  await expect(full).toContainText("Status: in-progress");
  await expect(full).toContainText("Due 2030-01-15");
  await expect(full).toContainText("work");
  await expect(full).toContainText("urgent");
});
