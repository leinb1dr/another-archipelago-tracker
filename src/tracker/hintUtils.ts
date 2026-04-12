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

/** Stable id for a hint row (storage / diff). */
export function hintStableKey(h: HintPacket): string {
  return `${h.receiving_player}:${h.finding_player}:${h.location}:${h.item}`;
}

/**
 * Unfound location in your world for another player's item, when the hint is priority
 * and/or the item is classified progression.
 */
export function isOpenPriorityOrProgressionHintForOthers(h: HintPacket, mySlot: number): boolean {
  if (h.found) return false;
  if (h.finding_player !== mySlot) return false;
  if (h.receiving_player === mySlot) return false;
  return isPriorityHint(h) || itemHasProgressionFlag(h.item_flags);
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

/** Item classification bits on `NetworkItem.flags` and `Hint.item_flags` (network protocol). */
export const ITEM_FLAG_PROGRESSION = 0b001;
export const ITEM_FLAG_USEFUL = 0b010;
export const ITEM_FLAG_TRAP = 0b100;

/** Chip labels in display order for each set classification bit. */
export function itemClassificationChipLabels(flags: number | undefined): string[] {
  if (flags === undefined) return [];
  const out: string[] = [];
  if ((flags & ITEM_FLAG_PROGRESSION) !== 0) out.push("Progression");
  if ((flags & ITEM_FLAG_USEFUL) !== 0) out.push("Useful");
  if ((flags & ITEM_FLAG_TRAP) !== 0) out.push("Trap");
  return out;
}

/** Outlined chip styles for item classification (purple / blue / brown). */
export type ItemClassificationChipSx = {
  borderColor: string;
  color: string;
  "&:hover": { backgroundColor: string };
};

export interface ItemClassificationChipSpec {
  key: "progression" | "useful" | "trap";
  label: string;
  sx: ItemClassificationChipSx;
}

const ITEM_CLASSIFICATION_SX: Record<
  "progression" | "useful" | "trap",
  ItemClassificationChipSx
> = {
  progression: {
    borderColor: "#7b1fa2",
    color: "#7b1fa2",
    "&:hover": { backgroundColor: "rgba(123, 31, 162, 0.08)" },
  },
  useful: {
    borderColor: "#1565c0",
    color: "#1565c0",
    "&:hover": { backgroundColor: "rgba(21, 101, 192, 0.08)" },
  },
  trap: {
    borderColor: "#6d4c41",
    color: "#6d4c41",
    "&:hover": { backgroundColor: "rgba(109, 76, 65, 0.08)" },
  },
};

/** Display specs for classification chips (same order as `itemClassificationChipLabels`). */
export function itemClassificationChipSpecs(flags: number | undefined): ItemClassificationChipSpec[] {
  if (flags === undefined) return [];
  const out: ItemClassificationChipSpec[] = [];
  if ((flags & ITEM_FLAG_PROGRESSION) !== 0) {
    out.push({ key: "progression", label: "Progression", sx: ITEM_CLASSIFICATION_SX.progression });
  }
  if ((flags & ITEM_FLAG_USEFUL) !== 0) {
    out.push({ key: "useful", label: "Useful", sx: ITEM_CLASSIFICATION_SX.useful });
  }
  if ((flags & ITEM_FLAG_TRAP) !== 0) {
    out.push({ key: "trap", label: "Trap", sx: ITEM_CLASSIFICATION_SX.trap });
  }
  return out;
}

/** Progression flag (bit 0) from NetworkItem.flags / Hint.item_flags */
export function itemHasProgressionFlag(flags: number | undefined): boolean {
  if (flags === undefined) return false;
  return (flags & ITEM_FLAG_PROGRESSION) !== 0;
}

export function hintStatusLabel(status: number | undefined): string {
  if (status === undefined) return "Unspecified";
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

/** MUI `Chip` color for each `HintStatus` value (parallel to item classification chips). */
export type HintStatusChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function hintStatusChipColor(status: number | undefined): HintStatusChipColor {
  const s = status ?? HINT_STATUS.HINT_UNSPECIFIED;
  switch (s) {
    case HINT_STATUS.HINT_UNSPECIFIED:
      return "default";
    case HINT_STATUS.HINT_NO_PRIORITY:
      return "info";
    case HINT_STATUS.HINT_AVOID:
      return "error";
    case HINT_STATUS.HINT_PRIORITY:
      return "success";
    case HINT_STATUS.HINT_FOUND:
      return "primary";
    default:
      return "default";
  }
}

export interface HintStatusChipSpec {
  key: string;
  label: string;
  color: HintStatusChipColor;
}

/** One chip per hint status (same pattern as `itemClassificationChipLabels` for flags). */
export function hintStatusChips(status: number | undefined): HintStatusChipSpec[] {
  return [
    {
      key: "hintStatus",
      label: hintStatusLabel(status),
      color: hintStatusChipColor(status),
    },
  ];
}
