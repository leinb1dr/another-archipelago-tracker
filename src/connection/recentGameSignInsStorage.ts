import { normalizeHost } from "./buildWsUrl";

export const RECENT_GAME_SIGN_INS_STORAGE_KEY = "archipelago-tracker.recentGameSignIns";

const MAX_ENTRIES = 30;

export type RecentGameSignIn = {
  host: string;
  port: string;
  /** Game title from the room (Connect `game` field). */
  game: string;
  /** Slot name used for Connect `name` (not display alias). */
  slotName: string;
};

function normalizePort(port: string): string {
  return port.trim();
}

function entryKey(e: RecentGameSignIn): string {
  return `${e.host}:${e.port}:${e.game}:${e.slotName}`;
}

function isValidEntry(x: unknown): x is RecentGameSignIn {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.host === "string" &&
    typeof o.port === "string" &&
    typeof o.game === "string" &&
    typeof o.slotName === "string" &&
    o.host.length > 0 &&
    o.port.length > 0 &&
    o.game.length > 0 &&
    o.slotName.length > 0
  );
}

export function loadRecentGameSignIns(): RecentGameSignIn[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_GAME_SIGN_INS_STORAGE_KEY);
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: RecentGameSignIn[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!isValidEntry(item)) continue;
      const host = normalizeHost(item.host);
      const port = normalizePort(item.port);
      const game = item.game.trim();
      const slotName = item.slotName.trim();
      if (!/^\d+$/.test(port) || !game || !slotName) continue;
      const row: RecentGameSignIn = { host, port, game, slotName };
      const k = entryKey(row);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(row);
    }
    return out.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persist(list: RecentGameSignIn[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RECENT_GAME_SIGN_INS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

export function upsertRecentGameSignIn(entry: RecentGameSignIn): void {
  const host = normalizeHost(entry.host);
  const port = normalizePort(entry.port);
  const game = entry.game.trim();
  const slotName = entry.slotName.trim();
  if (!host || !/^\d+$/.test(port) || !game || !slotName) return;

  const normalized: RecentGameSignIn = { host, port, game, slotName };
  const key = entryKey(normalized);
  const list = loadRecentGameSignIns().filter((e) => entryKey(e) !== key);
  list.unshift(normalized);
  persist(list.slice(0, MAX_ENTRIES));
}

export function removeRecentGameSignIn(entry: RecentGameSignIn): void {
  const key = entryKey({
    host: normalizeHost(entry.host),
    port: normalizePort(entry.port),
    game: entry.game.trim(),
    slotName: entry.slotName.trim(),
  });
  const list = loadRecentGameSignIns().filter((e) => entryKey(e) !== key);
  persist(list);
}

/** Entries for the same server (normalized host + port) as currently connected. */
export function filterGameSignInsForServer(
  entries: RecentGameSignIn[],
  hostInput: string,
  portInput: string,
): RecentGameSignIn[] {
  const host = normalizeHost(hostInput);
  const port = normalizePort(portInput);
  if (!host || !/^\d+$/.test(port)) return [];
  return entries.filter((e) => e.host === host && e.port === port);
}
