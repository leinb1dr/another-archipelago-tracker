import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RECENT_CONNECTIONS_STORAGE_KEY,
  loadRecentConnections,
  removeRecentConnection,
  upsertRecentConnection,
} from "./recentConnectionsStorage";

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

describe("recentConnectionsStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("load returns empty when missing", () => {
    mockLocalStorage();
    expect(loadRecentConnections()).toEqual([]);
  });

  it("upsert prepends and dedupes by host:port", () => {
    mockLocalStorage();
    upsertRecentConnection("alpha.example.com", "12345");
    upsertRecentConnection("beta.example.com", "80");
    upsertRecentConnection("alpha.example.com", "12345");
    expect(loadRecentConnections()).toEqual([
      { host: "alpha.example.com", port: "12345" },
      { host: "beta.example.com", port: "80" },
    ]);
  });

  it("remove drops entry", () => {
    mockLocalStorage();
    upsertRecentConnection("h", "1");
    upsertRecentConnection("h2", "2");
    removeRecentConnection("h", "1");
    expect(loadRecentConnections()).toEqual([{ host: "h2", port: "2" }]);
  });

  it("respects max entries", () => {
    mockLocalStorage();
    for (let i = 0; i < 25; i++) {
      upsertRecentConnection(`h${i}`, String(1000 + i));
    }
    expect(loadRecentConnections().length).toBeLessThanOrEqual(20);
  });

  it("load ignores corrupt JSON", () => {
    mockLocalStorage();
    localStorage.setItem(RECENT_CONNECTIONS_STORAGE_KEY, "not-json");
    expect(loadRecentConnections()).toEqual([]);
  });
});
