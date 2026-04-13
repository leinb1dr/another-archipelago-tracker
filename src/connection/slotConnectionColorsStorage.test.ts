import { afterEach, describe, expect, it, vi } from "vitest";
import type { NetworkPlayer } from "../protocol/connectPackets";
import {
  SLOT_CONNECTION_COLORS_STORAGE_KEY,
  accentColorForNetworkSlot,
  assignSlotConnectionColor,
  loadSlotConnectionColors,
  removeSlotConnectionColor,
  slotConnectionColorKey,
} from "./slotConnectionColorsStorage";

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

describe("slotConnectionColorsStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("slotConnectionColorKey normalizes host", () => {
    expect(slotConnectionColorKey("  LOCALHOST ", "80", "seed", 0, 1)).toBe("LOCALHOST|80|seed|0|1");
  });

  it("assign persists stable color per key", () => {
    mockLocalStorage();
    const k = slotConnectionColorKey("archipelago.gg", "38281", "abc", 0, 2);
    const a = assignSlotConnectionColor(k);
    expect(a).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(assignSlotConnectionColor(k)).toBe(a);
    expect(loadSlotConnectionColors()[k]).toBe(a);
  });

  it("remove clears key", () => {
    mockLocalStorage();
    const k = slotConnectionColorKey("h", "1", "s", 0, 0);
    assignSlotConnectionColor(k);
    removeSlotConnectionColor(k);
    expect(loadSlotConnectionColors()[k]).toBeUndefined();
  });

  it("load ignores invalid hex", () => {
    mockLocalStorage();
    localStorage.setItem(
      SLOT_CONNECTION_COLORS_STORAGE_KEY,
      JSON.stringify({ bad: "#gggggg", good: "#112233" }),
    );
    expect(loadSlotConnectionColors()).toEqual({ good: "#112233" });
  });

  it("accentColorForNetworkSlot uses player team", () => {
    const players: NetworkPlayer[] = [
      { team: 1, slot: 3, alias: "a", name: "a" },
    ];
    const m = new Map<string, string>([["1:3", "#1565c0"]]);
    expect(accentColorForNetworkSlot(players, 3, m)).toBe("#1565c0");
  });
});
