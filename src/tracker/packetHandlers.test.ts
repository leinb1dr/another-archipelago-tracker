import { describe, expect, it } from "vitest";
import type { ConnectedPacket } from "../protocol/connectPackets";
import type { RetrievedPacket } from "../protocol/serverPackets";
import { locationNameGroupsStorageKey, readHintsStorageKey } from "../protocol/serverPackets";
import { applyReceivedItems, applyRetrieved, initTrackerState } from "./packetHandlers";

function minimalConnected(overrides: Partial<ConnectedPacket> = {}): ConnectedPacket {
  return {
    cmd: "Connected",
    team: 0,
    slot: 1,
    players: [],
    ...overrides,
  };
}

describe("applyRetrieved", () => {
  const game = "TestGame";

  it("reads hints from Retrieved.keys (Archipelago spec)", () => {
    const prev = initTrackerState(minimalConnected({ team: 0, slot: 1 }));
    const hk = readHintsStorageKey(0, 1);
    const next = applyRetrieved(prev, {
      cmd: "Retrieved",
      keys: {
        [hk]: [
          {
            receiving_player: 1,
            finding_player: 2,
            location: 10,
            item: 20,
            found: false,
          },
        ],
      },
    }, game);
    expect(next.hints).toHaveLength(1);
    expect(next.hints[0].location).toBe(10);
  });

  it("falls back to top-level storage key (legacy mock shape)", () => {
    const prev = initTrackerState(minimalConnected({ team: 0, slot: 1 }));
    const hk = readHintsStorageKey(0, 1);
    const next = applyRetrieved(
      prev,
      {
        cmd: "Retrieved",
        keys: [hk],
        [hk]: [
          {
            receiving_player: 1,
            finding_player: 1,
            location: 5,
            item: 6,
            found: true,
          },
        ],
      } as unknown as RetrievedPacket,
      game,
    );
    expect(next.hints).toHaveLength(1);
    expect(next.hints[0].item).toBe(6);
  });

  it("reads location name groups from Retrieved.keys", () => {
    const prev = initTrackerState(minimalConnected());
    const lgk = locationNameGroupsStorageKey(game);
    const next = applyRetrieved(prev, {
      cmd: "Retrieved",
      keys: {
        [lgk]: {
          A: ["Loc One"],
        },
      },
    }, game);
    expect(next.locationGroups).toEqual({ A: ["Loc One"] });
  });
});

describe("applyReceivedItems", () => {
  const item = (n: Partial<{ item: number; location: number; player: number; flags: number }>) => ({
    item: 1,
    location: 2,
    player: 3,
    flags: 0,
    ...n,
  });

  it("replaces inventory when index is 0", () => {
    let prev = initTrackerState(minimalConnected());
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [item({ item: 10 })],
    });
    expect(prev.receivedItems).toEqual([item({ item: 10 })]);
    expect(prev.receivedItemsSyncError).toBeNull();

    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [item({ item: 20 }), item({ item: 30 })],
    });
    expect(prev.receivedItems).toEqual([item({ item: 20 }), item({ item: 30 })]);
    expect(prev.receivedItemsSyncError).toBeNull();
  });

  it("appends when index matches current length", () => {
    let prev = initTrackerState(minimalConnected());
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [item({ item: 1 })],
    });
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 1,
      items: [item({ item: 2 })],
    });
    expect(prev.receivedItems).toEqual([item({ item: 1 }), item({ item: 2 })]);
    expect(prev.receivedItemsSyncError).toBeNull();
  });

  it("sets sync error and keeps inventory on index mismatch", () => {
    let prev = initTrackerState(minimalConnected());
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [item({ item: 1 })],
    });
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 5,
      items: [item({ item: 99 })],
    });
    expect(prev.receivedItems).toEqual([item({ item: 1 })]);
    expect(prev.receivedItemsSyncError).toMatch(/index mismatch/);
  });

  it("ignores malformed entries in items array", () => {
    const prev = initTrackerState(minimalConnected());
    const next = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [{ item: 1, location: 2, player: 3, flags: 0 }, null, "x", { item: "bad" }] as never[],
    });
    expect(next.receivedItems).toEqual([item({})]);
  });
});
