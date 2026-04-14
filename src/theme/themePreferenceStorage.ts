export const THEME_PREFERENCE_STORAGE_KEY = "archipelago-tracker.themePreference";

export type ThemePreference = "light" | "dark";

function isThemePreference(x: unknown): x is ThemePreference {
  return x === "light" || x === "dark";
}

export function loadThemePreference(): ThemePreference {
  if (typeof localStorage === "undefined") return "light";
  try {
    const raw = localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
    if (raw === null || raw === "") return "light";
    const parsed = JSON.parse(raw) as unknown;
    if (isThemePreference(parsed)) return parsed;
    return "light";
  } catch {
    return "light";
  }
}

export function saveThemePreference(mode: ThemePreference): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, JSON.stringify(mode));
  } catch {
    /* quota */
  }
}
