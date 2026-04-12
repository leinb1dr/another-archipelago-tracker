import type { HintPacket } from "../protocol/serverPackets";
import { HINT_STATUS } from "../protocol/serverPackets";

function coerceFiniteInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

/** `found` may be omitted, or sent as 0/1 by some serializers. */
function coerceFound(v: unknown): boolean {
  if (v === true || v === false) return v;
  if (v === 0 || v === 1) return v === 1;
  return false;
}

export function parseHintList(raw: unknown): HintPacket[] {
  if (!Array.isArray(raw)) return [];
  const out: HintPacket[] = [];
  for (const h of raw) {
    if (h === null || typeof h !== "object") continue;
    const o = h as Record<string, unknown>;
    const receiving_player = coerceFiniteInt(o.receiving_player);
    const finding_player = coerceFiniteInt(o.finding_player);
    const location = coerceFiniteInt(o.location);
    const item = coerceFiniteInt(o.item);
    if (
      receiving_player === undefined ||
      finding_player === undefined ||
      location === undefined ||
      item === undefined
    ) {
      continue;
    }
    const found = coerceFound(o.found);
    out.push({
      receiving_player,
      finding_player,
      location,
      item,
      found,
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

/** Hint statuses the user may set via `UpdateHint` (excludes Found; server rejects HINT_FOUND). */
export const EDITABLE_HINT_STATUSES: readonly number[] = [
  HINT_STATUS.HINT_UNSPECIFIED,
  HINT_STATUS.HINT_NO_PRIORITY,
  HINT_STATUS.HINT_AVOID,
  HINT_STATUS.HINT_PRIORITY,
];

/** Only the receiving player's client may update status; Found cannot be changed manually. */
export function canChangeHintStatus(h: HintPacket, mySlot: number): boolean {
  if (h.receiving_player !== mySlot) return false;
  const s = h.status ?? HINT_STATUS.HINT_UNSPECIFIED;
  return s !== HINT_STATUS.HINT_FOUND;
}

/** Progression flag (bit 0) from NetworkItem.flags */
export function itemHasProgressionFlag(flags: number | undefined): boolean {
  if (flags === undefined) return false;
  return (flags & 0b001) !== 0;
}

export function hintStatusLabel(status: number | undefined): string {
  if (status === undefined) return "—";
  switch (status) {
    case HINT_STATUS.HINT_UNSPECIFIED:
      return "Unspecified";
    case HINT_STATUS.HINT_NO_PRIORITY:
      return "No priority";
    case HINT_STATUS.HINT_AVOID:
      return "Avoid";
    case HINT_STATUS.HINT_PRIORITY:
      return "Priority";
    case HINT_STATUS.HINT_FOUND:
      return "Found";
    default:
      return String(status);
  }
}
