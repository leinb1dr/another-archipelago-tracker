import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RECENT_GAME_SIGN_INS_STORAGE_KEY,
  filterGameSignInsForServer,
  loadRecentGameSignIns,
  removeRecentGameSignIn,
  upsertRecentGameSignIn,
} from "./recentGameSignInsStorage";

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

describe("recentGameSignInsStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("load returns empty when missing", () => {
    mockLocalStorage();
    expect(loadRecentGameSignIns()).toEqual([]);
  });

  it("upsert prepends and dedupes", () => {
    mockLocalStorage();
    upsertRecentGameSignIn({
      host: "h1",
      port: "1",
      game: "G1",
      slotName: "S1",
    });
    upsertRecentGameSignIn({
      host: "h2",
      port: "2",
      game: "G2",
      slotName: "S2",
    });
    upsertRecentGameSignIn({
      host: "h1",
      port: "1",
      game: "G1",
      slotName: "S1",
    });
    expect(loadRecentGameSignIns()).toEqual([
      { host: "h1", port: "1", game: "G1", slotName: "S1" },
      { host: "h2", port: "2", game: "G2", slotName: "S2" },
    ]);
  });

  it("remove drops entry", () => {
    mockLocalStorage();
    const a = { host: "h", port: "1", game: "G", slotName: "A" };
    const b = { host: "h", port: "1", game: "G", slotName: "B" };
    upsertRecentGameSignIn(a);
    upsertRecentGameSignIn(b);
    removeRecentGameSignIn(a);
    expect(loadRecentGameSignIns()).toEqual([b]);
  });

  it("filterGameSignInsForServer matches host and port", () => {
    const entries = [
      { host: "127.0.0.1", port: "53087", game: "A", slotName: "p1" },
      { host: "other", port: "1", game: "B", slotName: "p2" },
    ];
    expect(filterGameSignInsForServer(entries, "127.0.0.1", "53087")).toEqual([entries[0]]);
  });

  it("load ignores corrupt JSON", () => {
    mockLocalStorage();
    localStorage.setItem(RECENT_GAME_SIGN_INS_STORAGE_KEY, "not-json");
    expect(loadRecentGameSignIns()).toEqual([]);
  });
});
