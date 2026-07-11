import { describe, expect, it } from "vitest";
import { summarizeRoomDataPackage } from "./roomProgressSummary";

describe("summarizeRoomDataPackage", () => {
  it("counts loaded game location and item definitions", () => {
    const summary = summarizeRoomDataPackage(["Game A", "Game B"], {
      games: {
        "Game A": {
          location_name_to_id: {
            "A Location 1": 10,
            "A Location 2": 11,
          },
          item_name_to_id: {
            "A Item": 20,
          },
        },
        "Game B": {
          location_name_to_id: {
            "B Location": 30,
          },
          item_name_to_id: {
            "B Item 1": 40,
            "B Item 2": 41,
          },
        },
      },
    });

    expect(summary).toEqual({
      requestedGameCount: 2,
      loadedGameCount: 2,
      locationCount: 3,
      itemCount: 3,
      games: [
        { game: "Game A", loaded: true, locationCount: 2, itemCount: 1 },
        { game: "Game B", loaded: true, locationCount: 1, itemCount: 2 },
      ],
    });
  });

  it("deduplicates room games and marks missing packages", () => {
    const summary = summarizeRoomDataPackage(["Game A", "Game A", "Game C"], {
      games: {
        "Game A": {
          location_name_to_id: {
            "A Location": 10,
          },
        },
      },
    });

    expect(summary.requestedGameCount).toBe(2);
    expect(summary.loadedGameCount).toBe(1);
    expect(summary.locationCount).toBe(1);
    expect(summary.games).toEqual([
      { game: "Game A", loaded: true, locationCount: 1, itemCount: 0 },
      { game: "Game C", loaded: false, locationCount: 0, itemCount: 0 },
    ]);
  });
});
