import type { NetworkItem } from "../protocol/serverPackets";

/** Stable key for one row in a ReceivedItems batch (handles duplicate tuples). */
export function stableReceivedItemKeys(items: NetworkItem[]): string[] {
  const baseSeen = new Map<string, number>();
  return items.map((ni) => {
    const base = `${ni.item}:${ni.location}:${ni.player}:${ni.flags}`;
    const n = baseSeen.get(base) ?? 0;
    baseSeen.set(base, n + 1);
    return n === 0 ? base : `${base}~${n}`;
  });
}

export type MergedReceivedItemRecord = {
  item: NetworkItem;
  firstSeenAt: number;
};

export type ResolveReceivedItemsFirstSeen = (
  items: NetworkItem[],
  now: number,
) => MergedReceivedItemRecord[];

/**
 * Assigns firstSeenAt from persisted map or `now` for new keys. Updates `nextPersisted`
 * for every key in this batch (preserves entries for items not in this snapshot).
 */
export function mergeReceivedItemFirstSeen(
  items: NetworkItem[],
  now: number,
  persisted: Readonly<Record<string, number>>,
): { records: MergedReceivedItemRecord[]; nextPersisted: Record<string, number> } {
  const keys = stableReceivedItemKeys(items);
  const nextPersisted = { ...persisted };
  const records: MergedReceivedItemRecord[] = items.map((item, i) => {
    const key = keys[i]!;
    let firstSeenAt = nextPersisted[key];
    if (firstSeenAt === undefined) {
      firstSeenAt = now;
      nextPersisted[key] = firstSeenAt;
    }
    return { item, firstSeenAt };
  });
  return { records, nextPersisted };
}
