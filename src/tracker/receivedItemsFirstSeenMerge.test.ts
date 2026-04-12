import { describe, expect, it } from "vitest";
import { mergeReceivedItemFirstSeen, stableReceivedItemKeys } from "./receivedItemsFirstSeenMerge";

const ni = (n: Partial<{ item: number; location: number; player: number; flags: number }>) => ({
  item: 1,
  location: 2,
  player: 3,
  flags: 0,
  ...n,
});

describe("stableReceivedItemKeys", () => {
  it("uses base key for first occurrence and suffix for duplicates", () => {
    const a = ni({ item: 10 });
    const b = ni({ item: 20 });
    expect(stableReceivedItemKeys([a, b, a])).toEqual(["10:2:3:0", "20:2:3:0", "10:2:3:0~1"]);
  });
});

describe("mergeReceivedItemFirstSeen", () => {
  it("assigns now for new keys and preserves persisted timestamps", () => {
    const persisted = { "10:2:3:0": 1_000 };
    const items = [ni({ item: 10 }), ni({ item: 20 })];
    const { records, nextPersisted } = mergeReceivedItemFirstSeen(items, 2_000, persisted);
    expect(records[0]?.firstSeenAt).toBe(1_000);
    expect(records[1]?.firstSeenAt).toBe(2_000);
    expect(nextPersisted["10:2:3:0"]).toBe(1_000);
    expect(nextPersisted["20:2:3:0"]).toBe(2_000);
  });

  it("full snapshot refresh keeps first-seen for known keys", () => {
    let persisted: Record<string, number> = {};
    const first = mergeReceivedItemFirstSeen([ni({ item: 1 })], 100, persisted);
    persisted = first.nextPersisted;
    expect(first.records[0]?.firstSeenAt).toBe(100);

    const second = mergeReceivedItemFirstSeen(
      [ni({ item: 1 }), ni({ item: 2 })],
      999,
      persisted,
    );
    expect(second.records[0]?.firstSeenAt).toBe(100);
    expect(second.records[1]?.firstSeenAt).toBe(999);
  });
});
