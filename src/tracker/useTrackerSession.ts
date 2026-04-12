import { useCallback, useEffect, useRef, useState } from "react";
import type { SlotSession } from "../protocol/connectPackets";
import type { RoomInfo } from "../protocol/roomInfo";
import {
  buildGetDataPackagePacket,
  buildGetPacket,
  buildSetNotifyPacket,
  locationNameGroupsStorageKey,
  readHintsStorageKey,
} from "../protocol/serverPackets";
import type { PrintJsonPacket } from "../protocol/serverPackets";
import { sendArchipelagoPacket } from "../connection/sendArchipelagoPacket";
import {
  initTrackerState,
  processUnknownPacket,
  type TrackerRuntimeState,
} from "./packetHandlers";
import {
  checkedLocationsLastVisitStorageKey,
  saveCheckedIdsForNextVisit,
} from "./checkedLocationsLastVisitStorage";
import {
  filterScoutedToValidLocations,
  loadScoutedLocations,
  saveScoutedLocations,
  scoutedLocationsStorageKey,
} from "./scoutedLocationsStorage";

export function useTrackerSession(options: {
  socket: WebSocket | null;
  slotSession: SlotSession | null;
  room: RoomInfo | null;
}): {
  tracker: TrackerRuntimeState | null;
  protocolError: string | null;
} {
  const { socket, slotSession, room } = options;
  const [tracker, setTracker] = useState<TrackerRuntimeState | null>(null);
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const sessionKeyRef = useRef<string>("");
  const deferredHintsGetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackerRef = useRef<TrackerRuntimeState | null>(null);

  const bootstrapSession = useCallback((ws: WebSocket, session: SlotSession, roomInfo: RoomInfo) => {
    const connected = session.connected;
    let next = initTrackerState(connected);
    for (const p of session.connectBatchRest ?? []) {
      next = processUnknownPacket(next, p, session.game);
    }
    const validLocationIds = new Set<number>();
    for (const id of connected.missing_locations ?? []) validLocationIds.add(id);
    for (const id of connected.checked_locations ?? []) validLocationIds.add(id);
    const scoutKey = scoutedLocationsStorageKey(roomInfo.seed_name, connected.team, connected.slot);
    const storedScouts = loadScoutedLocations(scoutKey);
    if (storedScouts) {
      const filtered = filterScoutedToValidLocations(storedScouts, validLocationIds);
      next = { ...next, scoutedLocations: { ...next.scoutedLocations, ...filtered } };
    }
    setTracker(next);
    setProtocolError(null);

    const games =
      roomInfo.games.length > 0 ? roomInfo.games : [session.game];
    const hintsKey = readHintsStorageKey(connected.team, connected.slot);
    const groupsKey = locationNameGroupsStorageKey(session.game);
    sendArchipelagoPacket(ws, buildGetDataPackagePacket(games));
    sendArchipelagoPacket(ws, buildGetPacket([hintsKey, groupsKey]));
    sendArchipelagoPacket(ws, buildSetNotifyPacket([`hints_${connected.team}_${connected.slot}`]));
  }, []);

  useEffect(() => {
    if (!socket || !slotSession || !room) {
      if (deferredHintsGetRef.current) {
        clearTimeout(deferredHintsGetRef.current);
        deferredHintsGetRef.current = null;
      }
      setTracker(null);
      sessionKeyRef.current = "";
      return;
    }

    const key = `${slotSession.displayName}:${slotSession.connected.slot}:${slotSession.game}`;
    const isNew = sessionKeyRef.current !== key;
    if (isNew) {
      sessionKeyRef.current = key;
    }

    const onMessage = (ev: MessageEvent) => {
      const raw = typeof ev.data === "string" ? ev.data : "";
      let data: unknown;
      try {
        data = JSON.parse(raw) as unknown;
      } catch {
        return;
      }
      if (!Array.isArray(data)) return;

      for (const p of data) {
        if (p === null || typeof p !== "object" || !("cmd" in p)) continue;
        const cmd = (p as { cmd?: string }).cmd;
        if (cmd === "PrintJSON") {
          const pj = p as PrintJsonPacket;
          if (pj.type === "Hint") {
            sendArchipelagoPacket(
              socket,
              buildGetPacket([readHintsStorageKey(slotSession.connected.team, slotSession.connected.slot)]),
            );
          }
          continue;
        }
        setTracker((prev) => {
          if (!prev) return prev;
          return processUnknownPacket(prev, p, slotSession.game);
        });
      }
    };

    socket.addEventListener("message", onMessage);
    if (isNew) {
      bootstrapSession(socket, slotSession, room);
      const hk = readHintsStorageKey(slotSession.connected.team, slotSession.connected.slot);
      deferredHintsGetRef.current = setTimeout(() => {
        deferredHintsGetRef.current = null;
        sendArchipelagoPacket(socket, buildGetPacket([hk]));
      }, 400);
    }
    return () => {
      if (deferredHintsGetRef.current) {
        clearTimeout(deferredHintsGetRef.current);
        deferredHintsGetRef.current = null;
      }
      socket.removeEventListener("message", onMessage);
    };
  }, [socket, slotSession, room, bootstrapSession]);

  trackerRef.current = tracker;

  useEffect(() => {
    if (!room || !slotSession) return;
    const storageKey = checkedLocationsLastVisitStorageKey(
      room.seed_name,
      slotSession.connected.team,
      slotSession.connected.slot,
    );
    return () => {
      const t = trackerRef.current;
      if (!t) return;
      saveCheckedIdsForNextVisit(storageKey, t.location.checkedLocationIds);
    };
  }, [room, slotSession]);

  useEffect(() => {
    if (!tracker || !slotSession || !room) return;
    saveScoutedLocations(
      scoutedLocationsStorageKey(room.seed_name, slotSession.connected.team, slotSession.connected.slot),
      tracker.scoutedLocations,
    );
  }, [tracker?.scoutedLocations, slotSession, room]);

  return { tracker, protocolError };
}
