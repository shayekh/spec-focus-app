import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/tokens.css", "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const vars: Record<string, string> = {};
  for (const match of css.slice(open + 1, close).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    const [, name, value] = match;
    if (name && value) vars[name] = value;
  }
  return vars;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio]. 4.5 is WCAG AA for normal text, 3 for UI outlines.
const TEXT_PAIRS: [string, string, number][] = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["text", "surface-alt", 4.5],
  ["text-muted", "bg", 4.5],
  ["text-muted", "surface", 4.5],
  ["text-muted", "surface-alt", 4.5],
  ["placeholder", "surface", 4.5],
  ["placeholder", "surface-alt", 4.5],
  ["accent-text", "accent", 4.5],
  ["danger-text", "danger", 4.5],
  ["warning-text", "warning-bg", 4.5],
  ["overdue", "surface", 4.5],
  ["overdue", "surface-alt", 4.5],
  ["danger", "surface", 4.5],
  ["focus", "surface", 3],
  ["focus", "bg", 3],
];

describe.each([
  ["light", ":root {"],
  ["dark", ':root[data-theme="dark"]'],
])("%s theme contrast", (_name, selector) => {
  const tokens = block(selector);

  it.each(TEXT_PAIRS)("%s on %s is at least %s:1", (fg, bg, minimum) => {
    const foreground = tokens[fg];
    const background = tokens[bg];
    expect(foreground, `missing token --${fg}`).toBeDefined();
    expect(background, `missing token --${bg}`).toBeDefined();
    expect(contrast(foreground as string, background as string)).toBeGreaterThanOrEqual(minimum);
  });
});
