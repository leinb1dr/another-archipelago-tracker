import type { HintPacket } from "../protocol/serverPackets";
import { HINT_STATUS } from "../protocol/serverPackets";

export function parseHintList(raw: unknown): HintPacket[] {
  if (!Array.isArray(raw)) return [];
  const out: HintPacket[] = [];
  for (const h of raw) {
    if (h === null || typeof h !== "object") continue;
    const o = h as Record<string, unknown>;
    if (
      typeof o.receiving_player !== "number" ||
      typeof o.finding_player !== "number" ||
      typeof o.location !== "number" ||
      typeof o.item !== "number" ||
      typeof o.found !== "boolean"
    ) {
      continue;
    }
    out.push({
      receiving_player: o.receiving_player,
      finding_player: o.finding_player,
      location: o.location,
      item: o.item,
      found: o.found,
      entrance: typeof o.entrance === "string" ? o.entrance : undefined,
      item_flags: typeof o.item_flags === "number" ? o.item_flags : undefined,
      status: typeof o.status === "number" ? o.status : undefined,
    });
  }
  return out;
}

export function hintsForReceivingPlayer(hints: HintPacket[], slot: number): HintPacket[] {
  return hints.filter((h) => h.receiving_player === slot);
}

export function hintsForFindingPlayer(hints: HintPacket[], slot: number): HintPacket[] {
  return hints.filter((h) => h.finding_player === slot);
}

export function isPriorityHint(h: HintPacket): boolean {
  return h.status === HINT_STATUS.HINT_PRIORITY;
}

/** Progression flag (bit 0) from NetworkItem.flags */
export function itemHasProgressionFlag(flags: number | undefined): boolean {
  if (flags === undefined) return false;
  return (flags & 0b001) !== 0;
}
