import { useState } from "react";
import { applyTheme, initialTheme, saveTheme, type Theme } from "../storage/preferences";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  }

  return (
    <button type="button" aria-pressed={theme === "dark"} onClick={toggle}>
      Dark theme
    </button>
  );
}
