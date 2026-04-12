import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectedPacket } from "../protocol/connectPackets";
import type { RetrievedPacket } from "../protocol/serverPackets";
import { locationNameGroupsStorageKey, readHintsStorageKey } from "../protocol/serverPackets";
import { applyLocationInfo, applyReceivedItems, applyRetrieved, initTrackerState } from "./packetHandlers";

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

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replaces inventory when index is 0", () => {
    const ts1 = Date.now();
    let prev = initTrackerState(minimalConnected());
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [item({ item: 10 })],
    });
    expect(prev.receivedItems).toEqual([{ item: item({ item: 10 }), firstSeenAt: ts1 }]);
    expect(prev.receivedItemsSyncError).toBeNull();

    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"));
    const ts2 = Date.now();
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [item({ item: 20 }), item({ item: 30 })],
    });
    expect(prev.receivedItems).toEqual([
      { item: item({ item: 20 }), firstSeenAt: ts2 },
      { item: item({ item: 30 }), firstSeenAt: ts2 },
    ]);
    expect(prev.receivedItemsSyncError).toBeNull();
  });

  it("appends when index matches current length", () => {
    const ts1 = Date.now();
    let prev = initTrackerState(minimalConnected());
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [item({ item: 1 })],
    });
    vi.setSystemTime(new Date("2024-06-01T11:00:00.000Z"));
    const ts2 = Date.now();
    prev = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 1,
      items: [item({ item: 2 })],
    });
    expect(prev.receivedItems).toEqual([
      { item: item({ item: 1 }), firstSeenAt: ts1 },
      { item: item({ item: 2 }), firstSeenAt: ts2 },
    ]);
    expect(prev.receivedItemsSyncError).toBeNull();
  });

  it("sets sync error and keeps inventory on index mismatch", () => {
    const ts1 = Date.now();
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
    expect(prev.receivedItems).toEqual([{ item: item({ item: 1 }), firstSeenAt: ts1 }]);
    expect(prev.receivedItemsSyncError).toMatch(/index mismatch/);
  });

  it("ignores malformed entries in items array", () => {
    const ts1 = Date.now();
    const prev = initTrackerState(minimalConnected());
    const next = applyReceivedItems(prev, {
      cmd: "ReceivedItems",
      index: 0,
      items: [{ item: 1, location: 2, player: 3, flags: 0 }, null, "x", { item: "bad" }] as never[],
    });
    expect(next.receivedItems).toEqual([{ item: item({}), firstSeenAt: ts1 }]);
  });
});

describe("applyLocationInfo", () => {
  it("stores items by location id", () => {
    const prev = initTrackerState(minimalConnected());
    const next = applyLocationInfo(prev, {
      cmd: "LocationInfo",
      locations: [
        { item: 10, location: 100, player: 2, flags: 1 },
        { item: 11, location: 100, player: 2, flags: 0 },
      ],
    });
    expect(next.scoutedLocations[100]).toHaveLength(2);
    expect(next.scoutedLocations[100]?.[0]?.item).toBe(10);
  });

  it("replaces prior scout data for the same location", () => {
    let prev = initTrackerState(minimalConnected());
    prev = applyLocationInfo(prev, {
      cmd: "LocationInfo",
      locations: [{ item: 1, location: 50, player: 1, flags: 0 }],
    });
    prev = applyLocationInfo(prev, {
      cmd: "LocationInfo",
      locations: [{ item: 2, location: 50, player: 1, flags: 0 }],
    });
    expect(prev.scoutedLocations[50]).toEqual([{ item: 2, location: 50, player: 1, flags: 0 }]);
  });

  it("no-ops when locations array is empty or invalid", () => {
    const prev = initTrackerState(minimalConnected());
    expect(applyLocationInfo(prev, { cmd: "LocationInfo", locations: [] })).toBe(prev);
  });
});
