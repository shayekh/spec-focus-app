import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Constitution IV: no `any`, no @ts-ignore, and no type assertion without an inline explanation.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function codeOf(line: string): string {
  return line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
}

const files = sourceFiles("src");

describe("type safety in src/ (Constitution IV)", () => {
  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("never uses `any` or TypeScript suppression comments", () => {
    const offences: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/@ts-(ignore|nocheck|expect-error)/.test(line)) offences.push(`${file}:${i + 1} suppression`);
          if (/(:\s*any\b|<any>|\bas any\b|\bany\[\])/.test(codeOf(line))) offences.push(`${file}:${i + 1} any`);
        });
    }
    expect(offences).toEqual([]);
  });

  it("has no type assertion without an inline explanation", () => {
    const offences: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        const code = codeOf(line);
        // `x as Type` assertions, but not `as const` or import/export renames.
        const isAssertion =
          /\bas\s+(?!const\b)[A-Za-z_{[(]/.test(code) && !/^\s*(import|export)\b/.test(code);
        if (!isAssertion) return;
        const explained = /\/\/\s*\S/.test(line) || /^\s*\/\/\s*\S/.test(lines[i - 1] ?? "");
        if (!explained) offences.push(`${file}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offences).toEqual([]);
  });
});
