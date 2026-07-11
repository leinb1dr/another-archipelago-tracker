import type { DataPackageContents } from "../protocol/serverPackets";

export type RoomGameProgressSummary = {
  game: string;
  loaded: boolean;
  locationCount: number;
  itemCount: number;
};

export type RoomProgressSummary = {
  requestedGameCount: number;
  loadedGameCount: number;
  locationCount: number;
  itemCount: number;
  games: RoomGameProgressSummary[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function countFiniteIds(values: Record<string, number> | undefined): number {
  if (!values) return 0;
  return Object.values(values).filter((value) => typeof value === "number" && Number.isFinite(value)).length;
}

export function summarizeRoomDataPackage(
  roomGames: string[],
  dataPackage: DataPackageContents | null,
): RoomProgressSummary {
  const requestedGames = unique(roomGames);
  const dataPackageGames = dataPackage?.games ?? {};
  const games = requestedGames.map((game): RoomGameProgressSummary => {
    const gameData = dataPackageGames[game];
    const locationCount = countFiniteIds(gameData?.location_name_to_id);
    const itemCount = countFiniteIds(gameData?.item_name_to_id);
    return {
      game,
      loaded: Boolean(gameData),
      locationCount,
      itemCount,
    };
  });

  return {
    requestedGameCount: requestedGames.length,
    loadedGameCount: games.filter((game) => game.loaded).length,
    locationCount: games.reduce((sum, game) => sum + game.locationCount, 0),
    itemCount: games.reduce((sum, game) => sum + game.itemCount, 0),
    games,
  };
}
