import { describe, expect, it } from "vitest";
import { HINT_STATUS } from "../protocol/serverPackets";
import type { HintPacket } from "../protocol/serverPackets";
import {
  canChangeHintStatus,
  EDITABLE_HINT_STATUSES,
  hintStableKey,
  hintStatusChipColor,
  hintStatusChips,
  hintStatusLabel,
  hintsForFindingPlayer,
  hintsForReceivingPlayer,
  isOpenPriorityOrProgressionHintForOthers,
  isPriorityHint,
  itemClassificationChipLabels,
  itemClassificationChipSpecs,
  itemHasProgressionFlag,
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
    expect(hintStatusLabel(undefined)).toBe("Unspecified");
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

describe("canChangeHintStatus", () => {
  const base: HintPacket = {
    receiving_player: 1,
    finding_player: 2,
    location: 1,
    item: 1,
    found: false,
  };

  it("allows receiver when status is not Found", () => {
    expect(canChangeHintStatus({ ...base, status: HINT_STATUS.HINT_PRIORITY }, 1)).toBe(true);
    expect(canChangeHintStatus({ ...base, status: undefined }, 1)).toBe(true);
  });

  it("denies non-receiver", () => {
    expect(canChangeHintStatus({ ...base, status: HINT_STATUS.HINT_PRIORITY }, 2)).toBe(false);
  });

  it("denies Found status", () => {
    expect(canChangeHintStatus({ ...base, status: HINT_STATUS.HINT_FOUND }, 1)).toBe(false);
  });

  it("editable list excludes Found", () => {
    expect(EDITABLE_HINT_STATUSES).not.toContain(HINT_STATUS.HINT_FOUND);
    expect(EDITABLE_HINT_STATUSES).toHaveLength(4);
  });
});

describe("hintStatusChips and hintStatusChipColor", () => {
  it("maps each HintStatus to a chip spec with label and color", () => {
    expect(hintStatusChips(undefined)).toEqual([
      { key: "hintStatus", label: "Unspecified", color: "default" },
    ]);
    expect(hintStatusChips(HINT_STATUS.HINT_UNSPECIFIED)).toEqual([
      { key: "hintStatus", label: "Unspecified", color: "default" },
    ]);
    expect(hintStatusChips(HINT_STATUS.HINT_NO_PRIORITY)).toEqual([
      { key: "hintStatus", label: "No priority", color: "info" },
    ]);
    expect(hintStatusChips(HINT_STATUS.HINT_AVOID)).toEqual([
      { key: "hintStatus", label: "Avoid", color: "error" },
    ]);
    expect(hintStatusChips(HINT_STATUS.HINT_PRIORITY)).toEqual([
      { key: "hintStatus", label: "Priority", color: "success" },
    ]);
    expect(hintStatusChips(HINT_STATUS.HINT_FOUND)).toEqual([
      { key: "hintStatus", label: "Found", color: "primary" },
    ]);
    expect(hintStatusChipColor(999)).toBe("default");
  });
});

describe("itemClassificationChipLabels", () => {
  it("returns empty for undefined or no bits", () => {
    expect(itemClassificationChipLabels(undefined)).toEqual([]);
    expect(itemClassificationChipLabels(0)).toEqual([]);
  });

  it("maps progression, useful, and trap bits to labels in order", () => {
    expect(itemClassificationChipLabels(0b001)).toEqual(["Progression"]);
    expect(itemClassificationChipLabels(0b010)).toEqual(["Useful"]);
    expect(itemClassificationChipLabels(0b100)).toEqual(["Trap"]);
    expect(itemClassificationChipLabels(0b111)).toEqual(["Progression", "Useful", "Trap"]);
  });

  it("itemClassificationChipSpecs matches label order and keys", () => {
    expect(itemClassificationChipSpecs(undefined)).toEqual([]);
    const all = itemClassificationChipSpecs(0b111);
    expect(all.map((s) => s.key)).toEqual(["progression", "useful", "trap"]);
    expect(all.map((s) => s.label)).toEqual(["Progression", "Useful", "Trap"]);
    expect(all[0]?.sx.borderColor).toBe("#7b1fa2");
    expect(all[1]?.sx.borderColor).toBe("#1565c0");
    expect(all[2]?.sx.borderColor).toBe("#6d4c41");
  });

  it("itemHasProgressionFlag matches progression bit", () => {
    expect(itemHasProgressionFlag(undefined)).toBe(false);
    expect(itemHasProgressionFlag(0)).toBe(false);
    expect(itemHasProgressionFlag(0b001)).toBe(true);
    expect(itemHasProgressionFlag(0b010)).toBe(false);
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

describe("hintStableKey", () => {
  it("concatenates the four ids", () => {
    const h: HintPacket = {
      receiving_player: 2,
      finding_player: 1,
      location: 10,
      item: 20,
      found: false,
    };
    expect(hintStableKey(h)).toBe("2:1:10:20");
  });
});

describe("isOpenPriorityOrProgressionHintForOthers", () => {
  const mySlot = 1;
  const base = (o: Partial<HintPacket> & Pick<HintPacket, "receiving_player" | "finding_player" | "location" | "item">): HintPacket => ({
    receiving_player: o.receiving_player,
    finding_player: o.finding_player,
    location: o.location,
    item: o.item,
    found: o.found ?? false,
    status: o.status,
    item_flags: o.item_flags,
  });

  it("is true for finder self, other receiver, unfound, priority status", () => {
    const h = base({
      receiving_player: 2,
      finding_player: mySlot,
      location: 1,
      item: 1,
      status: HINT_STATUS.HINT_PRIORITY,
    });
    expect(isOpenPriorityOrProgressionHintForOthers(h, mySlot)).toBe(true);
  });

  it("is true for progression flag without priority status", () => {
    const h = base({
      receiving_player: 2,
      finding_player: mySlot,
      location: 1,
      item: 1,
      status: HINT_STATUS.HINT_UNSPECIFIED,
      item_flags: 0b001,
    });
    expect(isOpenPriorityOrProgressionHintForOthers(h, mySlot)).toBe(true);
  });

  it("is true when both priority and progression", () => {
    const h = base({
      receiving_player: 2,
      finding_player: mySlot,
      location: 1,
      item: 1,
      status: HINT_STATUS.HINT_PRIORITY,
      item_flags: 0b001,
    });
    expect(isOpenPriorityOrProgressionHintForOthers(h, mySlot)).toBe(true);
  });

  it("is false when wrong finder", () => {
    const h = base({
      receiving_player: 2,
      finding_player: 3,
      location: 1,
      item: 1,
      status: HINT_STATUS.HINT_PRIORITY,
    });
    expect(isOpenPriorityOrProgressionHintForOthers(h, mySlot)).toBe(false);
  });

  it("is false when receiver is self", () => {
    const h = base({
      receiving_player: mySlot,
      finding_player: mySlot,
      location: 1,
      item: 1,
      status: HINT_STATUS.HINT_PRIORITY,
    });
    expect(isOpenPriorityOrProgressionHintForOthers(h, mySlot)).toBe(false);
  });

  it("is false when found", () => {
    const h = base({
      receiving_player: 2,
      finding_player: mySlot,
      location: 1,
      item: 1,
      found: true,
      status: HINT_STATUS.HINT_PRIORITY,
    });
    expect(isOpenPriorityOrProgressionHintForOthers(h, mySlot)).toBe(false);
  });

  it("is false when neither priority nor progression", () => {
    const h = base({
      receiving_player: 2,
      finding_player: mySlot,
      location: 1,
      item: 1,
      status: HINT_STATUS.HINT_NO_PRIORITY,
      item_flags: 0b010,
    });
    expect(isOpenPriorityOrProgressionHintForOthers(h, mySlot)).toBe(false);
  });
});
