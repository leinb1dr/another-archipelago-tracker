import type { ConnectedPacket } from "../protocol/connectPackets";
import type { RoomUpdatePacket } from "../protocol/serverPackets";

export type LocationTrackingState = {
  checkedLocationIds: number[];
  missingLocationIds: number[];
  hintPoints: number | null;
};

export function initLocationStateFromConnected(connected: ConnectedPacket): LocationTrackingState {
  const checked = new Set(connected.checked_locations ?? []);
  const missing = new Set(connected.missing_locations ?? []);
  return {
    checkedLocationIds: [...checked],
    missingLocationIds: [...missing],
    hintPoints: typeof connected.hint_points === "number" ? connected.hint_points : null,
  };
}

export function mergeRoomUpdate(
  prev: LocationTrackingState,
  update: RoomUpdatePacket,
): LocationTrackingState {
  const checked = new Set(prev.checkedLocationIds);
  const missing = new Set(prev.missingLocationIds);
  for (const id of update.checked_locations ?? []) {
    checked.add(id);
    missing.delete(id);
  }
  const hintPoints =
    typeof update.hint_points === "number" ? update.hint_points : prev.hintPoints;
  return {
    checkedLocationIds: [...checked].sort((a, b) => a - b),
    missingLocationIds: [...missing].sort((a, b) => a - b),
    hintPoints,
  };
}

export function completionRatio(state: LocationTrackingState): number | null {
  const checked = state.checkedLocationIds.length;
  const missing = state.missingLocationIds.length;
  const total = checked + missing;
  if (total === 0) return null;
  return checked / total;
}
