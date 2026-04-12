import type { ConnectedPacket, NetworkPlayer } from "../protocol/connectPackets";
import { slotGamesFromConnected } from "./slotGames";
import type {
  DataPackagePacket,
  HintPacket,
  LocationInfoPacket,
  NetworkItem,
  ReceivedItemsPacket,
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

function parseNetworkItems(raw: unknown): NetworkItem[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkItem[] = [];
  for (const el of raw) {
    if (el === null || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    if (
      typeof o.item === "number" &&
      typeof o.location === "number" &&
      typeof o.player === "number" &&
      typeof o.flags === "number"
    ) {
      out.push({
        item: o.item,
        location: o.location,
        player: o.player,
        flags: o.flags,
      });
    }
  }
  return out;
}

/** One inventory row from `ReceivedItems` plus when this client first stored it. */
export type ReceivedItemRecord = {
  item: NetworkItem;
  /** Milliseconds since Unix epoch when this client first recorded this row. */
  firstSeenAt: number;
};

function wrapReceivedItems(items: NetworkItem[], now: number): ReceivedItemRecord[] {
  return items.map((item) => ({ item, firstSeenAt: now }));
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
  /** Items queued for this slot (`ReceivedItems`), in server order. */
  receivedItems: ReceivedItemRecord[];
  /** Set when `ReceivedItems.index` does not match the expected next index. */
  receivedItemsSyncError: string | null;
  /** Location id → items revealed by `LocationInfo` (from LocationScouts). */
  scoutedLocations: Record<number, NetworkItem[]>;
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
    receivedItems: [],
    receivedItemsSyncError: null,
    scoutedLocations: {},
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

export function applyReceivedItems(
  prev: TrackerRuntimeState,
  packet: ReceivedItemsPacket,
): TrackerRuntimeState {
  const items = parseNetworkItems(packet.items);
  const index = packet.index;
  const now = Date.now();

  if (index === 0) {
    return {
      ...prev,
      receivedItems: wrapReceivedItems(items, now),
      receivedItemsSyncError: null,
    };
  }

  if (index === prev.receivedItems.length) {
    return {
      ...prev,
      receivedItems: [...prev.receivedItems, ...wrapReceivedItems(items, now)],
      receivedItemsSyncError: null,
    };
  }

  return {
    ...prev,
    receivedItemsSyncError: `ReceivedItems index mismatch: expected ${prev.receivedItems.length}, got ${index}.`,
  };
}

export function applyLocationInfo(
  prev: TrackerRuntimeState,
  packet: LocationInfoPacket,
): TrackerRuntimeState {
  const raw = packet.locations;
  const items = parseNetworkItems(raw);
  if (items.length === 0) return prev;

  const byLocation = new Map<number, NetworkItem[]>();
  for (const ni of items) {
    const loc = ni.location;
    const list = byLocation.get(loc) ?? [];
    list.push(ni);
    byLocation.set(loc, list);
  }

  const scoutedLocations = { ...prev.scoutedLocations };
  for (const [locId, list] of byLocation) {
    scoutedLocations[locId] = list;
  }
  return { ...prev, scoutedLocations };
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
    case "ReceivedItems":
      return applyReceivedItems(prev, packet as ReceivedItemsPacket);
    case "LocationInfo":
      return applyLocationInfo(prev, packet as LocationInfoPacket);
    default:
      return prev;
  }
}
