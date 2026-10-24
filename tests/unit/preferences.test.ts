import { describe, expect, it } from "vitest";
import {
  THEME_KEY,
  applyTheme,
  loadTheme,
  resolveTheme,
  saveTheme,
} from "../../src/storage/preferences";

describe("preferences", () => {
  it("returns null when no theme has been saved", () => {
    expect(loadTheme()).toBeNull();
  });

  it("round-trips light and dark", () => {
    saveTheme("dark");
    expect(loadTheme()).toBe("dark");
    saveTheme("light");
    expect(loadTheme()).toBe("light");
  });

  it("ignores invalid stored values", () => {
    localStorage.setItem(THEME_KEY, "purple");
    expect(loadTheme()).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    try {
      expect(() => saveTheme("dark")).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it("uses the saved theme when there is one", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("falls back to the system preference when nothing is saved", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("applies the theme to the document element", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
