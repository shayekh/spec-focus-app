import { expect, test, type Page } from "@playwright/test";

interface Seed {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "completed";
  dueDate?: string;
  tags?: string[];
  createdAt: string;
}

function seedDocument(seeds: Seed[]) {
  return {
    version: 1,
    tasks: seeds.map((s, i) => ({
      id: `id-${i}`,
      title: s.title,
      description: s.description ?? "",
      priority: s.priority,
      status: s.status,
      dueDate: s.dueDate ?? null,
      tags: s.tags ?? [],
      createdAt: s.createdAt,
      updatedAt: s.createdAt,
    })),
  };
}

async function seed(page: Page, seeds: Seed[]) {
  await page.addInitScript((doc) => {
    if (!localStorage.getItem("focus-app:tasks")) {
      localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
    }
  }, seedDocument(seeds));
  await page.goto("/");
}

const seeds: Seed[] = [
  { title: "Alpha", priority: "low", status: "todo", tags: ["home"], createdAt: "2026-10-01T00:00:00.000Z" },
  { title: "Beta", description: "needs milk", priority: "high", status: "in-progress", tags: ["work"], dueDate: "2030-05-01", createdAt: "2026-10-02T00:00:00.000Z" },
  { title: "Gamma", priority: "high", status: "completed", tags: ["work", "urgent"], dueDate: "2030-01-01", createdAt: "2026-10-03T00:00:00.000Z" },
];

const combo = (page: Page, name: string) =>
  page.getByRole("combobox", { name, exact: true });

const titles = (page: Page) => page.getByRole("heading", { level: 3 }).allTextContents();

test("filters, searches, and sorts the task list", async ({ page }) => {
  await seed(page, seeds);
  expect(await titles(page)).toEqual(["Gamma", "Beta", "Alpha"]);

  await combo(page, "Status").selectOption("in-progress");
  expect(await titles(page)).toEqual(["Beta"]);
  await page.getByRole("button", { name: "Clear filters" }).first().click();

  await combo(page, "Priority").selectOption("high");
  expect(await titles(page)).toEqual(["Gamma", "Beta"]);

  await combo(page, "Tag").selectOption("urgent");
  expect(await titles(page)).toEqual(["Gamma"]);

  await combo(page, "Priority").selectOption("low");
  await expect(page.getByText("No tasks match your filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).last().click();
  expect(await titles(page)).toEqual(["Gamma", "Beta", "Alpha"]);

  await page.getByRole("searchbox", { name: "Search" }).fill("MILK");
  expect(await titles(page)).toEqual(["Beta"]);
  await page.getByRole("searchbox", { name: "Search" }).fill("");

  await combo(page, "Sort by").selectOption("dueDate");
  expect(await titles(page)).toEqual(["Gamma", "Beta", "Alpha"]);

  await combo(page, "Sort by").selectOption("priority");
  expect(await titles(page)).toEqual(["Gamma", "Beta", "Alpha"]);
});

test("the tag filter resets when its last task loses the tag", async ({ page }) => {
  await seed(page, seeds);
  await combo(page, "Tag").selectOption("home");
  expect(await titles(page)).toEqual(["Alpha"]);

  await page.getByRole("button", { name: "Edit Alpha" }).click();
  await page.getByRole("dialog").getByLabel("Tags").fill("");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

  await expect(combo(page, "Tag")).toHaveValue("all");
  expect(await titles(page)).toEqual(["Gamma", "Beta", "Alpha"]);
});
