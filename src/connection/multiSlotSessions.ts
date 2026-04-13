import { buildArchipelagoWsUrl } from "./buildWsUrl";
import { connectAndAwaitRoomInfo } from "./connectArchipelago";
import { sendConnectAndAwaitOutcome } from "./sendConnect";
import {
  buildConnectPacket,
  findPlayerForSlot,
  type SlotSession,
} from "../protocol/connectPackets";
import type { NetworkVersion } from "../protocol/roomInfo";

export type MultiSlotCredentials = {
  game: string;
  slotName: string;
  password?: string;
};

export type MultiSlotConnectionResult = {
  socket: WebSocket;
  session: SlotSession;
};

export async function connectSlotSession(
  host: string,
  port: string,
  version: NetworkVersion,
  credentials: MultiSlotCredentials,
): Promise<MultiSlotConnectionResult> {
  const url = buildArchipelagoWsUrl(host, port);
  const { socket } = await connectAndAwaitRoomInfo(url);
  try {
    const packet = buildConnectPacket({
      name: credentials.slotName,
      game: credentials.game,
      password: credentials.password,
      version,
    });
    const result = await sendConnectAndAwaitOutcome(socket, packet);
    if (result.outcome === "refused") {
      const errs = result.refused.errors?.length
        ? result.refused.errors.join(", ")
        : "Connection refused.";
      socket.close();
      throw new Error(errs);
    }

    const player = findPlayerForSlot(result.connected);
    const display = player?.alias ?? player?.name ?? credentials.slotName;
    return {
      socket,
      session: {
        game: credentials.game,
        displayName: display,
        connected: result.connected,
        connectBatchRest: result.connectBatchRest,
      },
    };
  } catch (error) {
    socket.close();
    throw error;
  }
}
