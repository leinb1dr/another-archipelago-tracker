import { normalizeHost } from "./buildWsUrl";

export const RECENT_CONNECTIONS_STORAGE_KEY = "archipelago-tracker.recentConnections";

const MAX_ENTRIES = 20;

export type RecentConnection = {
  host: string;
  port: string;
  /** User-defined label for this server (optional). */
  name?: string;
  /** Unix ms when this host:port was first successfully saved (omitted on legacy entries). */
  firstConnectedAt?: number;
};

function normalizePort(port: string): string {
  return port.trim();
}

function connectionKey(host: string, port: string): string {
  return `${host}:${port}`;
}

function isValidEntry(x: unknown): x is RecentConnection {
  if (x === null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.host !== "string" || typeof o.port !== "string" || o.host.length === 0 || o.port.length === 0) {
    return false;
  }
  if (o.name !== undefined && typeof o.name !== "string") return false;
  if (
    o.firstConnectedAt !== undefined &&
    (typeof o.firstConnectedAt !== "number" || !Number.isFinite(o.firstConnectedAt))
  ) {
    return false;
  }
  return true;
}

export function loadRecentConnections(): RecentConnection[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_CONNECTIONS_STORAGE_KEY);
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: RecentConnection[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!isValidEntry(item)) continue;
      const host = normalizeHost(item.host);
      const port = normalizePort(item.port);
      if (!/^\d+$/.test(port)) continue;
      const k = connectionKey(host, port);
      if (seen.has(k)) continue;
      seen.add(k);
      const nameTrim = item.name?.trim();
      out.push({
        host,
        port,
        ...(nameTrim ? { name: nameTrim } : {}),
        ...(item.firstConnectedAt !== undefined ? { firstConnectedAt: item.firstConnectedAt } : {}),
      });
    }
    return out.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persist(list: RecentConnection[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RECENT_CONNECTIONS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Pushes host:port to the front of recents. Preserves `firstConnectedAt` when the same
 * host:port existed. Sets `name` from `friendlyName` when non-empty; otherwise keeps the
 * previous name for that host:port.
 */
export function upsertRecentConnection(hostInput: string, portInput: string, friendlyName?: string): void {
  const host = normalizeHost(hostInput);
  const port = normalizePort(portInput);
  if (!host || !/^\d+$/.test(port)) return;

  const list = loadRecentConnections();
  const key = connectionKey(host, port);
  const existing = list.find((e) => connectionKey(e.host, e.port) === key);
  const trimmed = friendlyName?.trim();
  const name = trimmed ? trimmed : existing?.name;

  const entry: RecentConnection = {
    host,
    port,
    ...(name ? { name } : {}),
    firstConnectedAt: existing?.firstConnectedAt ?? Date.now(),
  };

  const filtered = list.filter((e) => connectionKey(e.host, e.port) !== key);
  filtered.unshift(entry);
  persist(filtered.slice(0, MAX_ENTRIES));
}

export function removeRecentConnection(hostInput: string, portInput: string): void {
  const host = normalizeHost(hostInput);
  const port = normalizePort(portInput);
  const key = connectionKey(host, port);
  const list = loadRecentConnections().filter((e) => connectionKey(e.host, e.port) !== key);
  persist(list);
}
