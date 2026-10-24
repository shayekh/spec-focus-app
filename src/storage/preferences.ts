export type Theme = "light" | "dark";

export const THEME_KEY = "focus-app:theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** The saved theme, or null when the user has not chosen one. */
export function loadTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Theme still applies for this session; it just will not be remembered.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

/** A saved choice wins; otherwise follow the system preference. */
export function resolveTheme(saved: Theme | null, prefersDark: boolean): Theme {
  return saved ?? (prefersDark ? "dark" : "light");
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function initialTheme(): Theme {
  return resolveTheme(loadTheme(), systemPrefersDark());
}
