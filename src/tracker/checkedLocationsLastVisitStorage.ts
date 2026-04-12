const STORAGE_PREFIX = "archipelago-tracker.checkedBaseline:v1:";

/** Same identity as scout storage: seed + team + slot. */
export function checkedLocationsLastVisitStorageKey(
  seedName: string,
  team: number,
  slot: number,
): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(seedName)}:${team}:${slot}`;
}

function isNumberArray(x: unknown): x is number[] {
  return Array.isArray(x) && x.every((el) => typeof el === "number" && Number.isFinite(el));
}

/** `null` if never saved for this seed/team/slot (first visit). */
export function loadCheckedIdsFromLastVisit(storageKey: string): number[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null || raw === "") return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isNumberArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist current checked location ids; used as the baseline for the next session. */
export function saveCheckedIdsForNextVisit(storageKey: string, ids: number[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    /* quota / private mode */
  }
}
