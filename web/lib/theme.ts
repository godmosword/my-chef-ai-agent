/**
 * Manual three-way theme: light / dark / system.
 *
 * Mirrors the pattern used in the tech-pulse reference repo. The inline
 * bootstrap script in app/layout.tsx reads STORAGE_KEY before first paint to
 * set `data-theme` on <html>, eliminating FOUC. tokens.css resolves the
 * resulting CSS variables; absence of the attribute falls back to
 * prefers-color-scheme.
 */
export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "chef-theme";

export function readLocalTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function persistTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  if (theme === "system") {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

/**
 * Inline-script source — minified, runs synchronously in <head>. Keep tiny.
 */
export const THEME_BOOTSTRAP_SOURCE = `
try {
  var v = localStorage.getItem("${THEME_STORAGE_KEY}");
  if (v === "light" || v === "dark") {
    document.documentElement.setAttribute("data-theme", v);
  }
} catch (_) {}
`.trim();
