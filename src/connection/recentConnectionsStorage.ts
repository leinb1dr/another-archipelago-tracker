import { normalizeHost } from "./buildWsUrl";

export const RECENT_CONNECTIONS_STORAGE_KEY = "archipelago-tracker.recentConnections";

const MAX_ENTRIES = 20;

export type RecentConnection = {
  host: string;
  port: string;
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
  return typeof o.host === "string" && typeof o.port === "string" && o.host.length > 0 && o.port.length > 0;
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
      out.push({ host, port });
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

export function upsertRecentConnection(hostInput: string, portInput: string): void {
  const host = normalizeHost(hostInput);
  const port = normalizePort(portInput);
  if (!host || !/^\d+$/.test(port)) return;

  const list = loadRecentConnections().filter(
    (e) => connectionKey(e.host, e.port) !== connectionKey(host, port),
  );
  list.unshift({ host, port });
  persist(list.slice(0, MAX_ENTRIES));
}

export function removeRecentConnection(hostInput: string, portInput: string): void {
  const host = normalizeHost(hostInput);
  const port = normalizePort(portInput);
  const key = connectionKey(host, port);
  const list = loadRecentConnections().filter((e) => connectionKey(e.host, e.port) !== key);
  persist(list);
}
