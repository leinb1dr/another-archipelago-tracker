import type { DataPackageContents } from "../protocol/serverPackets";

export type IdNameMaps = {
  locationIdToName: Record<number, string>;
  itemIdToName: Record<number, string>;
};

/**
 * Builds id→name maps for one game from DataPackage `location_name_to_id` / `item_name_to_id`.
 */
export function mapsFromGameDataPackage(gameData: {
  location_name_to_id?: Record<string, number>;
  item_name_to_id?: Record<string, number>;
}): IdNameMaps {
  const locationIdToName: Record<number, string> = {};
  const itemIdToName: Record<number, string> = {};
  for (const [name, id] of Object.entries(gameData.location_name_to_id ?? {})) {
    if (typeof id === "number" && Number.isFinite(id)) {
      locationIdToName[id] = name;
    }
  }
  for (const [name, id] of Object.entries(gameData.item_name_to_id ?? {})) {
    if (typeof id === "number" && Number.isFinite(id)) {
      itemIdToName[id] = name;
    }
  }
  return { locationIdToName, itemIdToName };
}

export function mergeDataPackageContents(dp: DataPackageContents): Record<string, IdNameMaps> {
  const out: Record<string, IdNameMaps> = {};
  const games = dp.games ?? {};
  for (const [gameName, gameData] of Object.entries(games)) {
    out[gameName] = mapsFromGameDataPackage(gameData);
  }
  return out;
}
