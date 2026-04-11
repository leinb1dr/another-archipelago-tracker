import { describe, expect, it } from "vitest";
import {
  completionRatio,
  initLocationStateFromConnected,
  mergeRoomUpdate,
} from "./locationState";

describe("initLocationStateFromConnected", () => {
  it("initializes from missing and checked", () => {
    const s = initLocationStateFromConnected({
      cmd: "Connected",
      team: 0,
      slot: 1,
      players: [],
      missing_locations: [1, 2],
      checked_locations: [3],
      hint_points: 5,
    });
    expect(s.missingLocationIds).toEqual([1, 2]);
    expect(s.checkedLocationIds).toEqual([3]);
    expect(s.hintPoints).toBe(5);
  });
});

describe("mergeRoomUpdate", () => {
  it("moves ids from missing to checked", () => {
    const prev = initLocationStateFromConnected({
      cmd: "Connected",
      team: 0,
      slot: 1,
      players: [],
      missing_locations: [10, 20],
      checked_locations: [],
      hint_points: 0,
    });
    const next = mergeRoomUpdate(prev, {
      cmd: "RoomUpdate",
      checked_locations: [10],
    });
    expect(next.checkedLocationIds).toContain(10);
    expect(next.missingLocationIds).not.toContain(10);
    expect(next.missingLocationIds).toContain(20);
  });
});

describe("completionRatio", () => {
  it("returns checked / total", () => {
    const s = initLocationStateFromConnected({
      cmd: "Connected",
      team: 0,
      slot: 1,
      players: [],
      missing_locations: [1],
      checked_locations: [2, 3],
    });
    expect(completionRatio(s)).toBe(2 / 3);
  });

  it("returns null when no locations", () => {
    const s = initLocationStateFromConnected({
      cmd: "Connected",
      team: 0,
      slot: 1,
      players: [],
      missing_locations: [],
      checked_locations: [],
    });
    expect(completionRatio(s)).toBeNull();
  });
});
