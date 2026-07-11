import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadCachedRoomProgressSummary,
  ROOM_PROGRESS_SUMMARIES_STORAGE_KEY,
  saveCachedRoomProgressSummary,
} from "./roomProgressSummaryStorage";

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
}

const summary = {
  requestedGameCount: 2,
  loadedGameCount: 2,
  locationCount: 5,
  itemCount: 3,
  games: [
    { game: "Pick Me Game", loaded: true, locationCount: 3, itemCount: 2 },
    { game: "Second Quest", loaded: true, locationCount: 2, itemCount: 1 },
  ],
};

describe("roomProgressSummaryStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and loads a summary by normalized host, port, and seed", () => {
    mockLocalStorage();
    saveCachedRoomProgressSummary({
      host: " http://example.com/room ",
      port: " 38281 ",
      seedName: "seed-a",
      summary,
    });

    expect(loadCachedRoomProgressSummary("example.com", "38281", "seed-a")).toMatchObject({
      host: "example.com",
      port: "38281",
      seedName: "seed-a",
      cachedAt: expect.any(Number),
      summary,
    });
  });

  it("does not match a different seed on the same server", () => {
    mockLocalStorage();
    saveCachedRoomProgressSummary({
      host: "example.com",
      port: "38281",
      seedName: "seed-a",
      summary,
    });

    expect(loadCachedRoomProgressSummary("example.com", "38281", "seed-b")).toBeNull();
  });

  it("replaces the matching cache entry", () => {
    mockLocalStorage();
    saveCachedRoomProgressSummary({
      host: "example.com",
      port: "38281",
      seedName: "seed-a",
      summary,
    });
    saveCachedRoomProgressSummary({
      host: "example.com",
      port: "38281",
      seedName: "seed-a",
      summary: { ...summary, locationCount: 6 },
    });

    expect(loadCachedRoomProgressSummary("example.com", "38281", "seed-a")?.summary.locationCount).toBe(6);
  });

  it("ignores corrupt JSON", () => {
    mockLocalStorage();
    localStorage.setItem(ROOM_PROGRESS_SUMMARIES_STORAGE_KEY, "not-json");
    expect(loadCachedRoomProgressSummary("example.com", "38281", "seed-a")).toBeNull();
  });
});
