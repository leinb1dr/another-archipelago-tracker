import { describe, expect, it } from "vitest";
import { buildUpdateHintPacket, HINT_STATUS } from "./serverPackets";

describe("buildUpdateHintPacket", () => {
  it("matches Archipelago UpdateHint wire shape", () => {
    expect(
      buildUpdateHintPacket({
        player: 2,
        location: 100,
        status: HINT_STATUS.HINT_PRIORITY,
      }),
    ).toEqual({
      cmd: "UpdateHint",
      player: 2,
      location: 100,
      status: HINT_STATUS.HINT_PRIORITY,
    });
  });
});
