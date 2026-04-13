import type { NetworkPlayer } from "../protocol/connectPackets";
import { normalizeHost } from "./buildWsUrl";

export const SLOT_CONNECTION_COLORS_STORAGE_KEY = "archipelago-tracker.slotConnectionColors";

/** Distinct hues for multi-slot sessions (hex, works on light backgrounds and as accents). */
export const SLOT_CONNECTION_COLOR_PALETTE = [
  "#1565c0",
  "#2e7d32",
  "#ef6c00",
  "#6a1b9a",
  "#c62828",
  "#00838f",
  "#4527a0",
  "#558b2f",
  "#ad1457",
  "#00695c",
] as const;

export function slotConnectionColorKey(
  hostInput: string,
  portInput: string,
  seedName: string,
  team: number,
  slot: number,
): string {
  const host = normalizeHost(hostInput);
  const port = portInput.trim();
  return `${host}|${port}|${seedName}|${team}|${slot}`;
}

function isHexColor(x: unknown): x is string {
  return typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x);
}

export function loadSlotConnectionColors(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(SLOT_CONNECTION_COLORS_STORAGE_KEY);
    if (raw === null || raw === "") return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && k.length > 0 && isHexColor(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function persist(map: Record<string, string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SLOT_CONNECTION_COLORS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

/** Returns existing color or assigns the next available palette color and persists. */
export function assignSlotConnectionColor(storageKey: string): string {
  const map = { ...loadSlotConnectionColors() };
  const existing = map[storageKey];
  if (existing && isHexColor(existing)) return existing;

  const used = new Set(Object.values(map));
  const next =
    SLOT_CONNECTION_COLOR_PALETTE.find((c) => !used.has(c)) ??
    SLOT_CONNECTION_COLOR_PALETTE[Object.keys(map).length % SLOT_CONNECTION_COLOR_PALETTE.length];

  map[storageKey] = next;
  persist(map);
  return next;
}

export function removeSlotConnectionColor(storageKey: string): void {
  const map = { ...loadSlotConnectionColors() };
  if (!(storageKey in map)) return;
  delete map[storageKey];
  persist(map);
}

/** `team:slot` → hex for slots that currently have a registered connection in this app. */
export function buildConnectionColorsByTeamSlot(
  slotSessions: Array<{ session: { connected: { team: number; slot: number } } }>,
  host: string,
  port: string,
  seedName: string,
  colors: Record<string, string>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const entry of slotSessions) {
    const team = entry.session.connected.team;
    const slot = entry.session.connected.slot;
    const sk = slotConnectionColorKey(host, port, seedName, team, slot);
    const c = colors[sk];
    if (c) m.set(`${team}:${slot}`, c);
  }
  return m;
}

/**
 * Accent color for a network player slot id (e.g. ReceivedItems.player, hint *_player),
 * using the room roster for team resolution when possible.
 */
export function accentColorForNetworkSlot(
  players: NetworkPlayer[],
  slotId: number,
  colorsByTeamSlot: ReadonlyMap<string, string>,
): string | undefined {
  const p = players.find((x) => x.slot === slotId);
  if (p) {
    const direct = colorsByTeamSlot.get(`${p.team}:${p.slot}`);
    if (direct) return direct;
  }
  for (const [k, c] of colorsByTeamSlot) {
    const colon = k.indexOf(":");
    if (colon === -1) continue;
    const slotPart = k.slice(colon + 1);
    if (Number(slotPart) === slotId) return c;
  }
  return undefined;
}
