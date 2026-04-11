import { describe, expect, it } from "vitest";
import type { HintPacket } from "../protocol/serverPackets";
import {
  hintsForFindingPlayer,
  hintsForReceivingPlayer,
  parseHintList,
} from "./hintUtils";

describe("parseHintList", () => {
  it("parses valid hint objects", () => {
    const hints = parseHintList([
      {
        receiving_player: 1,
        finding_player: 2,
        location: 10,
        item: 20,
        found: false,
      },
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0].receiving_player).toBe(1);
  });

  it("ignores invalid entries", () => {
    expect(parseHintList([{}])).toEqual([]);
  });
});

describe("hint filters", () => {
  const sample: HintPacket[] = [
    {
      receiving_player: 1,
      finding_player: 2,
      location: 1,
      item: 1,
      found: false,
    },
    {
      receiving_player: 2,
      finding_player: 1,
      location: 2,
      item: 2,
      found: true,
    },
  ];

  it("hintsForReceivingPlayer", () => {
    expect(hintsForReceivingPlayer(sample, 1)).toHaveLength(1);
    expect(hintsForReceivingPlayer(sample, 1)[0].location).toBe(1);
  });

  it("hintsForFindingPlayer", () => {
    expect(hintsForFindingPlayer(sample, 1)).toHaveLength(1);
    expect(hintsForFindingPlayer(sample, 1)[0].location).toBe(2);
  });
});
