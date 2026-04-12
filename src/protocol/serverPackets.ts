/** Archipelago server → client packets used by the tracker (beyond RoomInfo / Connected). */

export interface RoomUpdatePacket {
  cmd: "RoomUpdate";
  checked_locations?: number[];
  hint_points?: number;
  players?: import("./connectPackets").NetworkPlayer[];
}

export interface DataPackagePacket {
  cmd: "DataPackage";
  data: DataPackageContents;
}

/** Subset of Data Package Contents we need for name resolution. */
export type DataPackageContents = {
  games?: Record<
    string,
    {
      location_name_to_id?: Record<string, number>;
      item_name_to_id?: Record<string, number>;
    }
  >;
};

/** Server → client: values live under `keys` (see network protocol Retrieved). */
export interface RetrievedPacket {
  cmd: "Retrieved";
  keys?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SetReplyPacket {
  cmd: "SetReply";
  key: string;
  value: unknown;
}

/** https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md#networkitem */
export interface NetworkItem {
  item: number;
  location: number;
  /** Slot of the world where the item was found (finder). */
  player: number;
  flags: number;
}

/** https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md#receiveditems */
export interface ReceivedItemsPacket {
  cmd: "ReceivedItems";
  /** Next empty slot in the receiving client's item list; `0` means full inventory replacement. */
  index: number;
  items: NetworkItem[];
}

/** https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md#hint */
export interface HintPacket {
  receiving_player: number;
  finding_player: number;
  location: number;
  item: number;
  found: boolean;
  entrance?: string;
  item_flags?: number;
  status?: number;
}

/** Matches Archipelago `NetUtils.HintStatus` (IntEnum). */
export const HINT_STATUS = {
  HINT_UNSPECIFIED: 0,
  HINT_NO_PRIORITY: 10,
  HINT_AVOID: 20,
  HINT_PRIORITY: 30,
  HINT_FOUND: 40,
} as const;

export interface PrintJsonPacket {
  cmd: "PrintJSON";
  data?: unknown[];
  type?: string;
}

export interface GetDataPackagePacket {
  cmd: "GetDataPackage";
  games?: string[];
}

export interface GetPacket {
  cmd: "Get";
  keys: string[];
}

export interface SetNotifyPacket {
  cmd: "SetNotify";
  keys: string[];
}

/** Client → server: https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md#updatehint */
export interface UpdateHintPacket {
  cmd: "UpdateHint";
  /** Finding player's slot ID (`Hint.finding_player`). */
  player: number;
  location: number;
  status: number;
}

export function buildGetDataPackagePacket(games: string[]): GetDataPackagePacket {
  return { cmd: "GetDataPackage", games: games.length ? games : undefined };
}

export function buildGetPacket(keys: string[]): GetPacket {
  return { cmd: "Get", keys };
}

export function buildSetNotifyPacket(keys: string[]): SetNotifyPacket {
  return { cmd: "SetNotify", keys };
}

export function buildUpdateHintPacket(args: {
  /** Finding player's slot ID (`Hint.finding_player`). */
  player: number;
  location: number;
  status: number;
}): UpdateHintPacket {
  return {
    cmd: "UpdateHint",
    player: args.player,
    location: args.location,
    status: args.status,
  };
}

export function readHintsStorageKey(team: number, slot: number): string {
  return `_read_hints_${team}_${slot}`;
}

export function locationNameGroupsStorageKey(gameName: string): string {
  return `_read_location_name_groups_${gameName}`;
}
