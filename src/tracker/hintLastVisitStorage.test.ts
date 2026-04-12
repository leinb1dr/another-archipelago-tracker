import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hintLastVisitStorageKey,
  loadHintKeysFromLastVisit,
  saveHintKeysForNextVisit,
} from "./hintLastVisitStorage";

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

describe("hintLastVisitStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("storage key matches scout-style encoding", () => {
    expect(hintLastVisitStorageKey("my seed", 0, 3)).toBe(
      "archipelago-tracker.hintBaseline:v1:my%20seed:0:3",
    );
  });

  it("load returns null when missing", () => {
    mockLocalStorage();
    expect(loadHintKeysFromLastVisit("k")).toBeNull();
  });

  it("load returns null for corrupt JSON", () => {
    mockLocalStorage();
    localStorage.setItem("k", "not-json");
    expect(loadHintKeysFromLastVisit("k")).toBeNull();
  });

  it("load returns null when not a string array", () => {
    mockLocalStorage();
    localStorage.setItem("k", JSON.stringify([1, 2]));
    expect(loadHintKeysFromLastVisit("k")).toBeNull();
  });

  it("round-trips keys", () => {
    mockLocalStorage();
    const key = hintLastVisitStorageKey("s", 1, 2);
    const keys = ["2:1:10:20", "3:1:5:6"];
    saveHintKeysForNextVisit(key, keys);
    expect(loadHintKeysFromLastVisit(key)).toEqual(keys);
  });

  it("round-trips empty array", () => {
    mockLocalStorage();
    const key = hintLastVisitStorageKey("s", 0, 0);
    saveHintKeysForNextVisit(key, []);
    expect(loadHintKeysFromLastVisit(key)).toEqual([]);
  });
});
