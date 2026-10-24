import { expect, test } from "@playwright/test";

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["todo", "in-progress", "completed"];

function seedDocument(count: number) {
  return {
    version: 1,
    tasks: Array.from({ length: count }, (_, i) => {
      const created = new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString();
      return {
        id: `id-${i}`,
        title: `Task number ${i} about topic ${i % 17}`,
        description: `Description for task ${i} with report${i % 11}`,
        priority: PRIORITIES[i % PRIORITIES.length],
        status: STATUSES[i % STATUSES.length],
        dueDate: i % 3 === 0 ? null : `2030-${String((i % 12) + 1).padStart(2, "0")}-15`,
        tags: [`tag${i % 20}`],
        createdAt: created,
        updatedAt: created,
      };
    }),
  };
}

test("with 500 tasks, search and filter updates the visible list in under 1 second (SC-003)", async ({
  page,
}) => {
  await page.addInitScript((doc) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
  }, seedDocument(500));
  await page.goto("/");
  const headings = page.getByRole("heading", { level: 3 });
  await expect(headings).toHaveCount(500);

  // Time from the input event until the browser has painted the updated list.
  const searchMs = await page.evaluate(async () => {
    const input = document.querySelector<HTMLInputElement>('input[type="search"]');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!input || !setValue) throw new Error("search box not found");
    const start = performance.now();
    setValue.call(input, "report7");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return performance.now() - start;
  });
  // i % 11 === 7 for i in 0..499 gives 45 matching tasks.
  await expect(headings).toHaveCount(45);
  expect(searchMs).toBeLessThan(1000);

  const filterMs = await page.evaluate(async () => {
    const select = Array.from(document.querySelectorAll("select")).find(
      (el) => el.labels?.[0]?.firstChild?.textContent?.trim() === "Status",
    );
    const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (!select || !setValue) throw new Error("status filter not found");
    const start = performance.now();
    setValue.call(select, "completed");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return performance.now() - start;
  });
  expect(filterMs).toBeLessThan(1000);
  const shown = await headings.count();
  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThan(45);
});
