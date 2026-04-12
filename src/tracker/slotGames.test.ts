import { describe, expect, it } from "vitest";
import type { ConnectedPacket } from "../protocol/connectPackets";
import type { IdNameMaps } from "./dataPackageMaps";
import { slotGamesFromConnected } from "./slotGames";
import { resolveItemName } from "./resolveNames";

describe("slotGamesFromConnected", () => {
  it("maps slot numbers to game from slot_info", () => {
    const c: ConnectedPacket = {
      cmd: "Connected",
      team: 0,
      slot: 1,
      players: [],
      slot_info: {
        1: { name: "P1", game: "GameA" },
        2: { name: "P2", game: "GameB" },
      },
    };
    expect(slotGamesFromConnected(c)).toEqual({ 1: "GameA", 2: "GameB" });
  });

  it("returns empty when slot_info missing", () => {
    expect(slotGamesFromConnected({ cmd: "Connected", team: 0, slot: 1, players: [] })).toEqual({});
  });
});

describe("resolveItemName with preferred game", () => {
  const maps: Record<string, IdNameMaps> = {
    GameA: {
      locationIdToName: {},
      itemIdToName: { 10: "Item A" },
    },
    GameB: {
      locationIdToName: {},
      itemIdToName: { 10: "Item B" },
    },
  };

  it("uses preferred game when ids collide", () => {
    expect(resolveItemName(maps, 10, "GameA")).toBe("Item A");
    expect(resolveItemName(maps, 10, "GameB")).toBe("Item B");
  });

  it("falls back to scanning games when preferred omitted", () => {
    expect(resolveItemName(maps, 10, undefined)).toBe("Item A");
  });
});
