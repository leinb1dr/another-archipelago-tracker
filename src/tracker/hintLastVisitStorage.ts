const STORAGE_PREFIX = "archipelago-tracker.hintBaseline:v1:";

/** Same identity as scout storage: seed + team + slot. */
export function hintLastVisitStorageKey(seedName: string, team: number, slot: number): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(seedName)}:${team}:${slot}`;
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((el) => typeof el === "string");
}

/** `null` if never saved for this seed/team/slot (first visit). */
export function loadHintKeysFromLastVisit(storageKey: string): string[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null || raw === "") return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isStringArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist current hint keys; used as the baseline for the next session. */
export function saveHintKeysForNextVisit(storageKey: string, keys: string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    /* quota / private mode */
  }
}
