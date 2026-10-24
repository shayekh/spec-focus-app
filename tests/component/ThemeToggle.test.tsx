import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../../src/ui/ThemeToggle";
import { loadTheme, saveTheme } from "../../src/storage/preferences";

describe("ThemeToggle", () => {
  it("switches to dark, applies data-theme, and saves the choice", async () => {
    saveTheme("light");
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /dark theme/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(loadTheme()).toBe("dark");
  });

  it("switches back to light", async () => {
    saveTheme("dark");
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /dark theme/i });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(loadTheme()).toBe("light");
  });

  it("is operable with the keyboard", async () => {
    saveTheme("light");
    render(<ThemeToggle />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /dark theme/i })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(document.documentElement.dataset.theme).toBe("dark");
    await userEvent.keyboard(" ");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
