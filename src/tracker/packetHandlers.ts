import type { ConnectedPacket, NetworkPlayer } from "../protocol/connectPackets";
import { slotGamesFromConnected } from "./slotGames";
import type {
  DataPackagePacket,
  HintPacket,
  RetrievedPacket,
  RoomUpdatePacket,
  SetReplyPacket,
} from "../protocol/serverPackets";
import { mergeDataPackageContents } from "./dataPackageMaps";
import type { IdNameMaps } from "./dataPackageMaps";
import { initLocationStateFromConnected, mergeRoomUpdate, type LocationTrackingState } from "./locationState";
import { parseHintList } from "./hintUtils";
import {
  locationNameGroupsStorageKey,
  readHintsStorageKey,
} from "../protocol/serverPackets";

/** Archipelago `Retrieved` puts requested values in `keys`; some mocks put them on the packet root. */
function getRetrievedStorageValue(packet: RetrievedPacket, storageKey: string): unknown {
  const keyed = packet.keys;
  if (keyed !== null && keyed !== undefined && typeof keyed === "object" && !Array.isArray(keyed)) {
    const dict = keyed as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(dict, storageKey)) {
      return dict[storageKey];
    }
  }
  if (Object.prototype.hasOwnProperty.call(packet, storageKey)) {
    return packet[storageKey];
  }
  return undefined;
}

export type TrackerRuntimeState = {
  location: LocationTrackingState;
  mapsByGame: Record<string, IdNameMaps>;
  hints: HintPacket[];
  /** Group label → location names (from server `location_name_groups`). */
  locationGroups: Record<string, string[]> | null;
  /** Slot → game name from `Connected.slot_info` (for resolving hint item/location IDs per world). */
  slotGames: Record<number, string>;
  team: number;
  slot: number;
  players: NetworkPlayer[];
};

export function initTrackerState(connected: ConnectedPacket): TrackerRuntimeState {
  const slotGames = slotGamesFromConnected(connected);
  return {
    location: initLocationStateFromConnected(connected),
    mapsByGame: {},
    hints: [],
    locationGroups: null,
    slotGames,
    team: connected.team,
    slot: connected.slot,
    players: connected.players ?? [],
  };
}

export function applyRoomUpdate(
  prev: TrackerRuntimeState,
  packet: RoomUpdatePacket,
): TrackerRuntimeState {
  const nextPlayers = packet.players ?? prev.players;
  return {
    ...prev,
    location: mergeRoomUpdate(prev.location, packet),
    players: nextPlayers,
  };
}

export function applyDataPackage(prev: TrackerRuntimeState, packet: DataPackagePacket): TrackerRuntimeState {
  const merged = mergeDataPackageContents(packet.data);
  const mapsByGame = { ...prev.mapsByGame };
  for (const [g, m] of Object.entries(merged)) {
    mapsByGame[g] = m;
  }
  return { ...prev, mapsByGame };
}

export function applyRetrieved(
  prev: TrackerRuntimeState,
  packet: RetrievedPacket,
  gameName: string,
): TrackerRuntimeState {
  let hints = prev.hints;
  const hk = readHintsStorageKey(prev.team, prev.slot);
  const hintRaw = getRetrievedStorageValue(packet, hk);
  if (hintRaw !== undefined) {
    hints = parseHintList(hintRaw);
  }
  let locationGroups = prev.locationGroups;
  const lgk = locationNameGroupsStorageKey(gameName);
  const groupsRaw = getRetrievedStorageValue(packet, lgk);
  if (groupsRaw !== undefined) {
    const raw = groupsRaw;
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      const next: Record<string, string[]> = {};
      for (const [label, ids] of Object.entries(o)) {
        if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) {
          next[label] = ids as string[];
        }
      }
      locationGroups = Object.keys(next).length ? next : prev.locationGroups;
    }
  }
  return { ...prev, hints, locationGroups };
}

export function applySetReply(prev: TrackerRuntimeState, packet: SetReplyPacket): TrackerRuntimeState {
  const { key, value } = packet;
  if (typeof key !== "string") return prev;
  if (key.includes("hints_") && key.includes(`${prev.team}_${prev.slot}`)) {
    return { ...prev, hints: parseHintList(value) };
  }
  return prev;
}

export function processUnknownPacket(
  prev: TrackerRuntimeState,
  packet: unknown,
  gameName: string,
): TrackerRuntimeState {
  if (packet === null || typeof packet !== "object" || !("cmd" in packet)) return prev;
  const cmd = (packet as { cmd?: string }).cmd;
  switch (cmd) {
    case "RoomUpdate":
      return applyRoomUpdate(prev, packet as RoomUpdatePacket);
    case "DataPackage":
      return applyDataPackage(prev, packet as DataPackagePacket);
    case "Retrieved":
      return applyRetrieved(prev, packet as RetrievedPacket, gameName);
    case "SetReply":
      return applySetReply(prev, packet as SetReplyPacket);
    default:
      return prev;
  }
}
