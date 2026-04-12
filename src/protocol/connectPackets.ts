import type { NetworkVersion } from "./roomInfo";

/** Tracker client tags sent with Connect (Archipelago protocol). */
export const TRACKER_CONNECT_TAGS = ["Tracker", "Checklist"] as const;

/** items_handling flags for receiving items + locations (see upstream docs). */
export const ITEMS_HANDLING_TRACKER = 7;

export interface ConnectPacket {
  cmd: "Connect";
  name: string;
  game: string;
  password: string;
  slot_data: boolean;
  items_handling: number;
  uuid: string;
  tags: string[];
  version: NetworkVersion;
}

export interface NetworkPlayer {
  team: number;
  slot: number;
  alias: string;
  name: string;
  class?: string;
}

/** From `Connected.slot_info` — maps each slot to static slot metadata (see upstream protocol). */
export type NetworkSlotInfo = {
  name: string;
  game: string;
  type?: number;
};

export interface ConnectedPacket {
  cmd: "Connected";
  team: number;
  slot: number;
  players: NetworkPlayer[];
  missing_locations?: number[];
  checked_locations?: number[];
  hint_points?: number;
  /** Slot index → game name and other metadata; keys may be string or number in JSON. */
  slot_info?: Record<string | number, NetworkSlotInfo>;
}

/** Active tracker sign-in after a successful `Connect` / `Connected` handshake. */
export type SlotSession = {
  game: string;
  displayName: string;
  connected: ConnectedPacket;
  /** Other packets in the same WebSocket message as `Connected` (e.g. `DataPackage`). */
  connectBatchRest?: unknown[];
};

export interface ConnectionRefusedPacket {
  cmd: "ConnectionRefused";
  errors?: string[];
}

export function buildConnectPacket(options: {
  name: string;
  game: string;
  password?: string;
  /** Client version sent to the server (often matches generator or a fixed tracker version). */
  version: NetworkVersion;
}): ConnectPacket {
  return {
    cmd: "Connect",
    name: options.name.trim(),
    game: options.game,
    password: options.password ?? "",
    slot_data: true,
    items_handling: ITEMS_HANDLING_TRACKER,
    uuid: crypto.randomUUID(),
    tags: [...TRACKER_CONNECT_TAGS],
    version: {
      major: options.version.major,
      minor: options.version.minor,
      build: options.version.build,
      class: "Version",
    },
  };
}

export function findPlayerForSlot(
  connected: ConnectedPacket,
): NetworkPlayer | undefined {
  return connected.players.find((p) => p.slot === connected.slot && p.team === connected.team);
}
