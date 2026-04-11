import type { IdNameMaps } from "./dataPackageMaps";

export type CheckRow = {
  id: number;
  name: string;
  checked: boolean;
  group: string;
};

/**
 * Assigns each location id to a group label using server `location_name_groups` when present,
 * otherwise a single "Locations" group.
 */
export function buildCheckRows(options: {
  checkedIds: number[];
  missingIds: number[];
  maps: IdNameMaps;
  locationGroups: Record<string, string[]> | null;
}): CheckRow[] {
  const { checkedIds, missingIds, maps, locationGroups } = options;
  const checkedSet = new Set(checkedIds);
  const allIds = [...new Set([...checkedIds, ...missingIds])].sort((a, b) => a - b);

  const nameToGroup = new Map<string, string>();
  if (locationGroups) {
    for (const [groupName, locNames] of Object.entries(locationGroups)) {
      for (const n of locNames) {
        if (!nameToGroup.has(n)) nameToGroup.set(n, groupName);
      }
    }
  }

  return allIds.map((id) => {
    const name = maps.locationIdToName[id] ?? `#${id}`;
    const group =
      (locationGroups ? nameToGroup.get(name) : undefined) ??
      (locationGroups && Object.keys(locationGroups).length ? "Other" : "Locations");
    return {
      id,
      name,
      checked: checkedSet.has(id),
      group,
    };
  });
}

export function groupRowsByLabel(rows: CheckRow[]): Map<string, CheckRow[]> {
  const m = new Map<string, CheckRow[]>();
  for (const row of rows) {
    const list = m.get(row.group) ?? [];
    list.push(row);
    m.set(row.group, list);
  }
  return m;
}
