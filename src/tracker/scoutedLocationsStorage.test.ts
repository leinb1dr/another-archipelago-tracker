import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterScoutedToValidLocations,
  loadScoutedLocations,
  saveScoutedLocations,
  scoutedLocationsStorageKey,
} from "./scoutedLocationsStorage";

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

describe("scoutedLocationsStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("storage key includes encoded seed, team, and slot", () => {
    expect(scoutedLocationsStorageKey("my seed", 0, 3)).toBe(
      "archipelago-tracker.scouted:v1:my%20seed:0:3",
    );
  });

  it("load returns null when missing", () => {
    mockLocalStorage();
    expect(loadScoutedLocations("k")).toBeNull();
  });

  it("load returns null for corrupt JSON", () => {
    mockLocalStorage();
    localStorage.setItem("k", "not-json");
    expect(loadScoutedLocations("k")).toBeNull();
  });

  it("load returns null when parsed object is empty after validation", () => {
    mockLocalStorage();
    localStorage.setItem("k", "{}");
    expect(loadScoutedLocations("k")).toBeNull();
  });

  it("round-trips valid scout map", () => {
    mockLocalStorage();
    const key = scoutedLocationsStorageKey("s", 1, 2);
    const data = {
      10: [{ item: 1, location: 10, player: 1, flags: 0 }],
    };
    saveScoutedLocations(key, data);
    expect(loadScoutedLocations(key)).toEqual(data);
  });

  it("load skips invalid network items", () => {
    mockLocalStorage();
    localStorage.setItem(
      "k",
      JSON.stringify({
        5: [{ item: 1, location: 5, player: 1, flags: 0 }, { bad: true }, null],
      }),
    );
    expect(loadScoutedLocations("k")).toEqual({
      5: [{ item: 1, location: 5, player: 1, flags: 0 }],
    });
  });

  it("save removes key when data is empty", () => {
    mockLocalStorage();
    const key = "archipelago-tracker.scouted:v1:x:0:0";
    saveScoutedLocations(key, { 1: [{ item: 1, location: 1, player: 1, flags: 0 }] });
    expect(localStorage.getItem(key)).not.toBeNull();
    saveScoutedLocations(key, {});
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("filterScoutedToValidLocations drops unknown location ids", () => {
    const data = {
      1: [{ item: 1, location: 1, player: 1, flags: 0 }],
      99: [{ item: 2, location: 99, player: 2, flags: 0 }],
    };
    const valid = new Set([1]);
    expect(filterScoutedToValidLocations(data, valid)).toEqual({
      1: [{ item: 1, location: 1, player: 1, flags: 0 }],
    });
  });
});
