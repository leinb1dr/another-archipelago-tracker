import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkedLocationsLastVisitStorageKey,
  loadCheckedIdsFromLastVisit,
  saveCheckedIdsForNextVisit,
} from "./checkedLocationsLastVisitStorage";

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

describe("checkedLocationsLastVisitStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("storage key matches scout-style encoding", () => {
    expect(checkedLocationsLastVisitStorageKey("my seed", 0, 3)).toBe(
      "archipelago-tracker.checkedBaseline:v1:my%20seed:0:3",
    );
  });

  it("load returns null when missing", () => {
    mockLocalStorage();
    expect(loadCheckedIdsFromLastVisit("k")).toBeNull();
  });

  it("load returns null for corrupt JSON", () => {
    mockLocalStorage();
    localStorage.setItem("k", "not-json");
    expect(loadCheckedIdsFromLastVisit("k")).toBeNull();
  });

  it("load returns null when not a number array", () => {
    mockLocalStorage();
    localStorage.setItem("k", JSON.stringify(["a", "b"]));
    expect(loadCheckedIdsFromLastVisit("k")).toBeNull();
  });

  it("load returns null when array has non-finite numbers", () => {
    mockLocalStorage();
    localStorage.setItem("k", JSON.stringify([1, NaN]));
    expect(loadCheckedIdsFromLastVisit("k")).toBeNull();
  });

  it("round-trips ids", () => {
    mockLocalStorage();
    const key = checkedLocationsLastVisitStorageKey("s", 1, 2);
    const ids = [10, 20, 30];
    saveCheckedIdsForNextVisit(key, ids);
    expect(loadCheckedIdsFromLastVisit(key)).toEqual(ids);
  });

  it("round-trips empty array", () => {
    mockLocalStorage();
    const key = checkedLocationsLastVisitStorageKey("s", 0, 0);
    saveCheckedIdsForNextVisit(key, []);
    expect(loadCheckedIdsFromLastVisit(key)).toEqual([]);
  });
});
