import { expect, test, type Page } from "@playwright/test";

const stamp = "2026-10-01T00:00:00.000Z";

function seed() {
  return {
    version: 1,
    tasks: [
      {
        id: "1",
        title: "A reasonably long task title that could wrap onto a second line on narrow screens",
        description: "word ".repeat(120).trim(),
        priority: "medium",
        status: "todo",
        dueDate: "2030-01-05",
        tags: ["alpha"],
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
  };
}

async function load(page: Page) {
  await page.addInitScript((doc) => {
    localStorage.setItem("focus-app:tasks", JSON.stringify(doc));
  }, seed());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
}

/** Contrast ratio between two computed `rgb(...)` colors (WCAG formula). */
async function contrast(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate(
    ([c1, c2]) => {
      const lum = (css: string) => {
        const [r, g, bl] = (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const ch = [r, g, bl].map((v) => {
          const x = (v ?? 0) / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) + 0.0722 * (ch[2] ?? 0);
      };
      const [hi, lo] = [lum(c1 ?? ""), lum(c2 ?? "")].sort((x, y) => y - x);
      return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
    },
    [a, b],
  );
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("input, select and textarea borders have at least 3:1 contrast with their background", async ({
      page,
    }) => {
      await load(page);
      const controls = [
        page.getByRole("searchbox", { name: "Search" }),
        page.getByRole("combobox", { name: "Status", exact: true }),
        page.getByRole("combobox", { name: "Sort by", exact: true }),
      ];
      for (const control of controls) {
        const border = await control.evaluate((el) => getComputedStyle(el).borderTopColor);
        const surface = await control.evaluate(
          (el) => getComputedStyle(el.closest(".filter-bar") ?? document.body).backgroundColor,
        );
        expect(await contrast(page, border, surface)).toBeGreaterThanOrEqual(3);
      }

      await page.getByRole("button", { name: "New task" }).click();
      const dialog = page.getByRole("dialog");
      for (const field of [
        dialog.getByLabel("Title"),
        dialog.getByLabel("Description"),
        dialog.getByLabel("Due date"),
      ]) {
        const border = await field.evaluate((el) => getComputedStyle(el).borderTopColor);
        const surface = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(await contrast(page, border, surface)).toBeGreaterThanOrEqual(3);
      }
    });
  });
}

test("task descriptions are limited to a readable line length", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await load(page);
  const description = page.locator(".task-description");
  const { width, fontSize } = await description.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    fontSize: parseFloat(getComputedStyle(el).fontSize),
  }));
  // 70ch is roughly 70 average-width characters; allow a generous 0.62em per ch for wide fonts.
  expect(width).toBeLessThanOrEqual(75 * fontSize * 0.62 + 1);
  expect(width).toBeGreaterThan(300);
});

test("due dates use tabular figures and headings balance their wrapping", async ({ page }) => {
  await load(page);
  const due = page.getByText("Due 2030-01-05");
  expect(await due.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toContain(
    "tabular-nums",
  );
  for (const heading of [
    page.getByRole("heading", { level: 1 }),
    page.getByRole("heading", { level: 3 }),
  ]) {
    const wrap = await heading.evaluate((el) => {
      const style = getComputedStyle(el);
      return `${style.getPropertyValue("text-wrap-style")} ${style.getPropertyValue("text-wrap")}`;
    });
    expect(wrap).toContain("balance");
  }
});

test("text sizes come from the scale and never go below 14px", async ({ page }) => {
  await load(page);
  const sizes = await page.evaluate(() => {
    const found = new Set<number>();
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if (el.childNodes.length && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim())) {
        found.add(parseFloat(getComputedStyle(el).fontSize));
      }
    }
    return Array.from(found).sort((a, b) => a - b);
  });
  expect(sizes[0]).toBeGreaterThanOrEqual(14);
  // 14px, 16px, 18px and 26px are the scale steps (0.875, 1, 1.125 and 1.625rem).
  for (const size of sizes) expect([14, 16, 18, 26]).toContain(size);
});
