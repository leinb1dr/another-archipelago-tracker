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

export function resolveItemName(
  mapsByGame: Record<string, IdNameMaps>,
  itemId: number,
): string {
  for (const m of Object.values(mapsByGame)) {
    const n = m.itemIdToName[itemId];
    if (n) return n;
  }
  return `#${itemId}`;
}
