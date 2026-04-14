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
    const list = loadRecentConnections();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      host: "alpha.example.com",
      port: "12345",
      firstConnectedAt: expect.any(Number),
    });
    expect(list[1]).toMatchObject({
      host: "beta.example.com",
      port: "80",
      firstConnectedAt: expect.any(Number),
    });
  });

  it("re-upsert preserves firstConnectedAt", () => {
    mockLocalStorage();
    upsertRecentConnection("alpha.example.com", "12345");
    const first = loadRecentConnections()[0].firstConnectedAt;
    expect(first).toBeDefined();
    upsertRecentConnection("alpha.example.com", "12345");
    expect(loadRecentConnections()[0].firstConnectedAt).toBe(first);
  });

  it("stores optional friendly name", () => {
    mockLocalStorage();
    upsertRecentConnection("h.example.com", "1", "My AP Run");
    expect(loadRecentConnections()[0]).toMatchObject({
      host: "h.example.com",
      port: "1",
      name: "My AP Run",
      firstConnectedAt: expect.any(Number),
    });
  });

  it("empty friendly name keeps previous name on repeat upsert", () => {
    mockLocalStorage();
    upsertRecentConnection("h.example.com", "1", "Labeled");
    upsertRecentConnection("h.example.com", "1", "");
    expect(loadRecentConnections()[0].name).toBe("Labeled");
  });

  it("remove drops entry", () => {
    mockLocalStorage();
    upsertRecentConnection("h", "1");
    upsertRecentConnection("h2", "2");
    removeRecentConnection("h", "1");
    expect(loadRecentConnections()).toEqual([
      expect.objectContaining({ host: "h2", port: "2" }),
    ]);
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
