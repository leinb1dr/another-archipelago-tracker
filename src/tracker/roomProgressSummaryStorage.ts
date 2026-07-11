import { normalizeHost } from "../connection/buildWsUrl";
import type { RoomProgressSummary } from "./roomProgressSummary";

export const ROOM_PROGRESS_SUMMARIES_STORAGE_KEY = "archipelago-tracker.roomProgressSummaries";

const MAX_ENTRIES = 50;

export type CachedRoomProgressSummary = {
  host: string;
  port: string;
  seedName: string;
  cachedAt: number;
  summary: RoomProgressSummary;
};

function normalizePort(port: string): string {
  return port.trim();
}

function cacheKey(host: string, port: string, seedName: string): string {
  return `${host}\u0000${port}\u0000${seedName}`;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRoomProgressSummary(value: unknown): value is RoomProgressSummary {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const summary = value as Record<string, unknown>;
  if (
    !isNonNegativeInteger(summary.requestedGameCount) ||
    !isNonNegativeInteger(summary.loadedGameCount) ||
    !isNonNegativeInteger(summary.locationCount) ||
    !isNonNegativeInteger(summary.itemCount) ||
    !Array.isArray(summary.games)
  ) {
    return false;
  }
  return summary.games.every((game) => {
    if (game === null || typeof game !== "object" || Array.isArray(game)) return false;
    const candidate = game as Record<string, unknown>;
    return (
      typeof candidate.game === "string" &&
      typeof candidate.loaded === "boolean" &&
      isNonNegativeInteger(candidate.locationCount) &&
      isNonNegativeInteger(candidate.itemCount)
    );
  });
}

function isValidEntry(value: unknown): value is CachedRoomProgressSummary {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.host === "string" &&
    typeof entry.port === "string" &&
    typeof entry.seedName === "string" &&
    entry.host.length > 0 &&
    entry.port.length > 0 &&
    entry.seedName.length > 0 &&
    typeof entry.cachedAt === "number" &&
    Number.isFinite(entry.cachedAt) &&
    isRoomProgressSummary(entry.summary)
  );
}

function loadEntries(): CachedRoomProgressSummary[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROOM_PROGRESS_SUMMARIES_STORAGE_KEY);
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: CachedRoomProgressSummary[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!isValidEntry(item)) continue;
      const host = normalizeHost(item.host);
      const port = normalizePort(item.port);
      const seedName = item.seedName.trim();
      if (!host || !/^\d+$/.test(port) || !seedName) continue;
      const key = cacheKey(host, port, seedName);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        host,
        port,
        seedName,
        cachedAt: item.cachedAt,
        summary: item.summary,
      });
    }
    return out.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persist(entries: CachedRoomProgressSummary[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ROOM_PROGRESS_SUMMARIES_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / private mode */
  }
}

export function loadCachedRoomProgressSummary(
  hostInput: string,
  portInput: string,
  seedNameInput: string,
): CachedRoomProgressSummary | null {
  const host = normalizeHost(hostInput);
  const port = normalizePort(portInput);
  const seedName = seedNameInput.trim();
  if (!host || !/^\d+$/.test(port) || !seedName) return null;

  const key = cacheKey(host, port, seedName);
  return loadEntries().find((entry) => cacheKey(entry.host, entry.port, entry.seedName) === key) ?? null;
}

export function saveCachedRoomProgressSummary(args: {
  host: string;
  port: string;
  seedName: string;
  summary: RoomProgressSummary;
}): void {
  const host = normalizeHost(args.host);
  const port = normalizePort(args.port);
  const seedName = args.seedName.trim();
  if (!host || !/^\d+$/.test(port) || !seedName || !isRoomProgressSummary(args.summary)) return;

  const key = cacheKey(host, port, seedName);
  const entry: CachedRoomProgressSummary = {
    host,
    port,
    seedName,
    cachedAt: Date.now(),
    summary: args.summary,
  };
  const entries = loadEntries().filter((item) => cacheKey(item.host, item.port, item.seedName) !== key);
  entries.unshift(entry);
  persist(entries.slice(0, MAX_ENTRIES));
}
