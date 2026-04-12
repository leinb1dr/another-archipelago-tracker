import type { NetworkItem } from "../protocol/serverPackets";

const STORAGE_PREFIX = "archipelago-tracker.scouted:v1:";

function isValidNetworkItem(x: unknown): x is NetworkItem {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.item === "number" &&
    typeof o.location === "number" &&
    typeof o.player === "number" &&
    typeof o.flags === "number"
  );
}

function parseNetworkItemArray(raw: unknown): NetworkItem[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkItem[] = [];
  for (const el of raw) {
    if (isValidNetworkItem(el)) out.push(el);
  }
  return out;
}

/** Stable key for localStorage (seed + team + slot). */
export function scoutedLocationsStorageKey(seedName: string, team: number, slot: number): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(seedName)}:${team}:${slot}`;
}

/** Drop scout entries whose location id is not in the current session’s location universe. */
export function filterScoutedToValidLocations(
  data: Record<number, NetworkItem[]>,
  validIds: Set<number>,
): Record<number, NetworkItem[]> {
  const out: Record<number, NetworkItem[]> = {};
  for (const [k, items] of Object.entries(data)) {
    const locId = Number(k);
    if (!Number.isFinite(locId) || !validIds.has(locId)) continue;
    const parsed = parseNetworkItemArray(items);
    if (parsed.length > 0) out[locId] = parsed;
  }
  return out;
}

export function loadScoutedLocations(storageKey: string): Record<number, NetworkItem[]> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null || raw === "") return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<number, NetworkItem[]> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const locId = Number(k);
      if (!Number.isFinite(locId)) continue;
      const items = parseNetworkItemArray(v);
      if (items.length > 0) out[locId] = items;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function saveScoutedLocations(storageKey: string, data: Record<number, NetworkItem[]>): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (Object.keys(data).length === 0) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}
