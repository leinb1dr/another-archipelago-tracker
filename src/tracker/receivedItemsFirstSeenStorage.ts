import { mergeReceivedItemFirstSeen, type ResolveReceivedItemsFirstSeen } from "./receivedItemsFirstSeenMerge";

const FIRST_SEEN_PREFIX = "archipelago-tracker.receivedItemsFirstSeen:v1:";
const LAST_SESSION_END_PREFIX = "archipelago-tracker.receivedItemsLastSessionEnd:v1:";

export function receivedItemsFirstSeenStorageKey(
  seedName: string,
  team: number,
  slot: number,
): string {
  return `${FIRST_SEEN_PREFIX}${encodeURIComponent(seedName)}:${team}:${slot}`;
}

export function receivedItemsLastSessionEndStorageKey(
  seedName: string,
  team: number,
  slot: number,
): string {
  return `${LAST_SESSION_END_PREFIX}${encodeURIComponent(seedName)}:${team}:${slot}`;
}

function isFirstSeenMap(x: unknown): x is Record<string, number> {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  for (const v of Object.values(x)) {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
  }
  return true;
}

export function loadReceivedItemsFirstSeenMap(storageKey: string): Record<string, number> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null || raw === "") return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!isFirstSeenMap(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveReceivedItemsFirstSeenMap(storageKey: string, map: Record<string, number>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

/** `null` if never saved for this seed/team/slot. */
export function loadLastSessionEndAt(storageKey: string): number | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveLastSessionEndAt(storageKey: string, ms: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey, String(ms));
  } catch {
    /* quota / private mode */
  }
}

export function createReceivedItemsFirstSeenResolver(
  seedName: string,
  team: number,
  slot: number,
): ResolveReceivedItemsFirstSeen {
  const storageKey = receivedItemsFirstSeenStorageKey(seedName, team, slot);
  return (items, now) => {
    const persisted = loadReceivedItemsFirstSeenMap(storageKey);
    const { records, nextPersisted } = mergeReceivedItemFirstSeen(items, now, persisted);
    saveReceivedItemsFirstSeenMap(storageKey, nextPersisted);
    return records;
  };
}
