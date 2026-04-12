import type { ConnectedPacket } from "../protocol/connectPackets";

/** Parses `Connected.slot_info` into slot number → game name (for name resolution). */
export function slotGamesFromConnected(connected: ConnectedPacket): Record<number, string> {
  const raw = connected.slot_info;
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<number, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const slot = Number(key);
    if (!Number.isFinite(slot) || val === null || typeof val !== "object" || Array.isArray(val)) {
      continue;
    }
    const game = (val as { game?: unknown }).game;
    if (typeof game === "string" && game.length > 0) {
      out[slot] = game;
    }
  }
  return out;
}

/** Game whose item definitions apply to this hint (`receiving_player`). */
export function gameForHintItem(slotGames: Record<number, string>, receivingPlayer: number): string | undefined {
  return slotGames[receivingPlayer];
}

/** Game whose location definitions apply to this hint (`finding_player`). */
export function gameForHintLocation(slotGames: Record<number, string>, findingPlayer: number): string | undefined {
  return slotGames[findingPlayer];
}
