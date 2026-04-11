/** Archipelago network protocol — RoomInfo packet (subset used by the tracker UI). */

export interface NetworkVersion {
  major: number;
  minor: number;
  build: number;
  class?: string;
}

export interface RoomInfo {
  cmd: "RoomInfo";
  version: NetworkVersion;
  generator_version: NetworkVersion;
  tags: string[];
  password: boolean;
  permissions: Record<string, number>;
  hint_cost: number;
  location_check_points: number;
  games: string[];
  datapackage_checksums?: Record<string, string>;
  seed_name: string;
  time: number;
}

export class RoomInfoParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomInfoParseError";
  }
}

export function parseRoomInfoFromFirstMessage(raw: string): RoomInfo {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    throw new RoomInfoParseError("Invalid JSON");
  }

  if (!Array.isArray(data)) {
    throw new RoomInfoParseError("Expected a JSON array");
  }

  const packet = data.find(
    (p): p is Record<string, unknown> =>
      p !== null && typeof p === "object" && (p as { cmd?: string }).cmd === "RoomInfo",
  );

  if (!packet) {
    throw new RoomInfoParseError("No RoomInfo command in first message");
  }

  if (typeof packet.seed_name !== "string") {
    throw new RoomInfoParseError("RoomInfo missing seed_name");
  }

  return packet as unknown as RoomInfo;
}
