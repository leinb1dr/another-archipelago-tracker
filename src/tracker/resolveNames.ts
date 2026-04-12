import type { NetworkPlayer } from "../protocol/connectPackets";
import type { IdNameMaps } from "./dataPackageMaps";

export function playerAlias(players: NetworkPlayer[], slot: number): string {
  const p = players.find((x) => x.slot === slot);
  return p?.alias ?? p?.name ?? `Slot ${slot}`;
}

export function resolveLocationName(
  mapsByGame: Record<string, IdNameMaps>,
  gameHint: string,
  locationId: number,
): string {
  const primary = mapsByGame[gameHint]?.locationIdToName[locationId];
  if (primary) return primary;
  for (const m of Object.values(mapsByGame)) {
    const n = m.locationIdToName[locationId];
    if (n) return n;
  }
  return `#${locationId}`;
}

/**
 * Resolves an item id to a display name.
 * When `preferredGame` is set (hint receiver's world), that game's map is tried before any fallback.
 */
export function resolveItemName(
  mapsByGame: Record<string, IdNameMaps>,
  itemId: number,
  preferredGame?: string | null,
): string {
  if (preferredGame !== undefined && preferredGame !== null && preferredGame !== "") {
    const fromPreferred = mapsByGame[preferredGame]?.itemIdToName[itemId];
    if (fromPreferred) return fromPreferred;
  }
  for (const m of Object.values(mapsByGame)) {
    const n = m.itemIdToName[itemId];
    if (n) return n;
  }
  return `#${itemId}`;
}
