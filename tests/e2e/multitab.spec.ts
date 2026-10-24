import { expect, test } from "@playwright/test";

test("a task added in one tab appears in another without reloading", async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto("/");
  await second.goto("/");

  await first.getByRole("button", { name: "New task" }).click();
  await first.getByRole("dialog").getByLabel("Title").fill("Shared across tabs");
  await first.getByRole("dialog").getByRole("button", { name: "Save" }).click();

  await expect(second.getByRole("heading", { level: 3, name: "Shared across tabs" })).toBeVisible();

  // And the other direction: deleting in the second tab removes it from the first.
  await second.getByRole("button", { name: "Delete Shared across tabs" }).click();
  await second.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(first.getByRole("heading", { level: 3, name: "Shared across tabs" })).toHaveCount(0);
});
