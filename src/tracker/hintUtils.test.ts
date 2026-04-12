import { describe, expect, it } from "vitest";
import { HINT_STATUS } from "../protocol/serverPackets";
import type { HintPacket } from "../protocol/serverPackets";
import {
  hintStatusLabel,
  hintsForFindingPlayer,
  hintsForReceivingPlayer,
  isPriorityHint,
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

  it("coerces found 0 and 1", () => {
    const hints = parseHintList([
      {
        receiving_player: 1,
        finding_player: 1,
        location: 1,
        item: 2,
        found: 0,
      },
      {
        receiving_player: 1,
        finding_player: 1,
        location: 2,
        item: 3,
        found: 1,
      },
    ]);
    expect(hints[0].found).toBe(false);
    expect(hints[1].found).toBe(true);
  });

  it("defaults missing found to false", () => {
    const hints = parseHintList([
      {
        receiving_player: 1,
        finding_player: 1,
        location: 1,
        item: 2,
      },
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0].found).toBe(false);
  });

  it("ignores invalid entries", () => {
    expect(parseHintList([{}])).toEqual([]);
  });
});

describe("hintStatusLabel and isPriorityHint", () => {
  it("labels upstream HintStatus values", () => {
    expect(hintStatusLabel(HINT_STATUS.HINT_PRIORITY)).toBe("Priority");
    expect(hintStatusLabel(HINT_STATUS.HINT_NO_PRIORITY)).toBe("No priority");
  });

  it("isPriorityHint uses status 30", () => {
    const h: HintPacket = {
      receiving_player: 1,
      finding_player: 1,
      location: 1,
      item: 1,
      found: false,
      status: HINT_STATUS.HINT_PRIORITY,
    };
    expect(isPriorityHint(h)).toBe(true);
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
