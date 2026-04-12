import { useEffect, useRef } from "react";
import type { SlotSession } from "../protocol/connectPackets";
import { resolveLocationName } from "./resolveNames";
import type { TrackerRuntimeState } from "./packetHandlers";

function buildCheckNotificationMessage(
  mapsByGame: TrackerRuntimeState["mapsByGame"],
  game: string,
  newIds: number[],
): string {
  const labels = newIds.map((id) => resolveLocationName(mapsByGame, game, id));
  if (labels.length === 1) {
    return `Check: ${labels[0]}`;
  }
  if (labels.length === 2) {
    return `Checks: ${labels[0]}, ${labels[1]}`;
  }
  const rest = labels.length - 2;
  return `Checks: ${labels[0]}, ${labels[1]}, and ${rest} more`;
}

/**
 * Calls `onNotify` when new location ids appear in `tracker.location.checkedLocationIds`
 * after the initial snapshot (no toast for the Connected/bootstrap set).
 */
export function useNotifyNewCheckedLocations(
  tracker: TrackerRuntimeState | null,
  slotSession: SlotSession,
  onNotify: ((message: string) => void) | undefined,
): void {
  const prevSetRef = useRef<Set<number> | null>(null);
  const sessionKeyRef = useRef<string>("");

  useEffect(() => {
    const key = `${slotSession.connected.team}:${slotSession.connected.slot}:${slotSession.game}`;
    if (sessionKeyRef.current !== key) {
      sessionKeyRef.current = key;
      prevSetRef.current = null;
    }
  }, [slotSession.connected.slot, slotSession.connected.team, slotSession.game]);

  useEffect(() => {
    if (!onNotify) return;

    if (!tracker) {
      prevSetRef.current = null;
      return;
    }

    const ids = tracker.location.checkedLocationIds;
    const nextSet = new Set(ids);

    if (prevSetRef.current === null) {
      prevSetRef.current = nextSet;
      return;
    }

    const prev = prevSetRef.current;
    const newIds = ids.filter((id) => !prev.has(id)).sort((a, b) => a - b);
    prevSetRef.current = nextSet;

    if (newIds.length === 0) return;
    onNotify(buildCheckNotificationMessage(tracker.mapsByGame, slotSession.game, newIds));
  }, [tracker, onNotify, slotSession.game]);
}
