import { afterEach, describe, expect, it, vi } from "vitest";
import {
  THEME_PREFERENCE_STORAGE_KEY,
  loadThemePreference,
  saveThemePreference,
} from "./themePreferenceStorage";

function mockLocalStorage() {
  let store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  });
  return () => {
    store = {};
  };
}

describe("themePreferenceStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to light when missing", () => {
    mockLocalStorage();
    expect(loadThemePreference()).toBe("light");
  });

  it("round-trips preference", () => {
    mockLocalStorage();
    saveThemePreference("dark");
    expect(loadThemePreference()).toBe("dark");
    expect(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe(JSON.stringify("dark"));
  });

  it("ignores invalid stored value", () => {
    mockLocalStorage();
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, JSON.stringify("sepia"));
    expect(loadThemePreference()).toBe("light");
  });
});
