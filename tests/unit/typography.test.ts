import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const typeCss = readFileSync("src/styles/typography.css", "utf8");
const appCss = readFileSync("src/styles/app.css", "utf8");

function tokens(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const match of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) vars[name] = value.trim();
  }
  return vars;
}

const type = tokens(typeCss);
const SIZE_STEPS = ["text-sm", "text-base", "text-md", "text-xl"];

describe("type scale tokens", () => {
  it("defines every step in rem so text scales with the user's settings", () => {
    for (const step of SIZE_STEPS) {
      expect(type[step], `--${step}`).toMatch(/^\d+(\.\d+)?rem$/);
    }
  });

  it("is strictly increasing and never smaller than 14px", () => {
    const sizes = SIZE_STEPS.map((step) => parseFloat(type[step] ?? "0"));
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1] ?? Infinity);
    }
    expect(sizes[0]).toBeGreaterThanOrEqual(0.875);
  });

  it("keeps body text at 1rem", () => {
    expect(type["text-base"]).toBe("1rem");
  });

  it("defines weight tokens", () => {
    expect(type["weight-regular"]).toBe("400");
    expect(type["weight-semibold"]).toBe("600");
    expect(type["weight-bold"]).toBe("700");
  });
});

describe("app.css uses the type tokens", () => {
  it("has no raw font-size or font-weight values", () => {
    const raw = appCss
      .split(/\r?\n/)
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /^font-(size|weight):/.test(line))
      .filter(({ line }) => !/var\(--(text|weight)-/.test(line) && !/inherit/.test(line));
    expect(raw).toEqual([]);
  });

  it("keeps body line height at 1.5 or more", () => {
    const match = appCss.match(/body\s*\{[^}]*line-height:\s*([\d.]+)/);
    expect(parseFloat(match?.[1] ?? "0")).toBeGreaterThanOrEqual(1.5);
  });

  it("limits task descriptions to a readable measure of at most 75 characters", () => {
    const rule = appCss.match(/\.task-description\s*\{[^}]*\}/)?.[0] ?? "";
    const measure = rule.match(/max-width:\s*(\d+)ch/);
    expect(measure, "max-width in ch").not.toBeNull();
    expect(parseInt(measure?.[1] ?? "0", 10)).toBeLessThanOrEqual(75);
    expect(parseInt(measure?.[1] ?? "0", 10)).toBeGreaterThanOrEqual(60);
  });

  it("uses tabular figures for due dates", () => {
    expect(appCss).toMatch(/\.badge\.due\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  });

  it("balances heading wrapping", () => {
    expect(appCss).toMatch(/h1,\s*h2,\s*h3\s*\{[^}]*text-wrap:\s*balance/);
  });
});
