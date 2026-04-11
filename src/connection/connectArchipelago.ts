import {
  parseRoomInfoFromFirstMessage,
  type RoomInfo,
} from "../protocol/roomInfo";

/**
 * Time allowed for the WebSocket to reach OPEN. TLS to remote hosts routinely
 * exceeds hundreds of milliseconds; the previous 300ms default closed the socket
 * before many real `wss://` handshakes completed.
 */
export const CONNECT_TIMEOUT_MS = 15_000;

export const CONNECTION_FAILED_MESSAGE = "Could not connect." as const;

/**
 * Opens a WebSocket, enforces {@link CONNECT_TIMEOUT_MS} for the initial handshake,
 * then reads the first text frame and parses `RoomInfo` from the Archipelago packet list.
 */
export function connectAndAwaitRoomInfo(wssUrl: string): Promise<RoomInfo> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(wssUrl);

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      ws.close();
      reject(new Error(CONNECTION_FAILED_MESSAGE));
    }, CONNECT_TIMEOUT_MS);

    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      ws.close();
      reject(new Error(CONNECTION_FAILED_MESSAGE));
    };

    ws.onopen = () => {
      window.clearTimeout(timer);
    };

    ws.onmessage = (ev) => {
      if (settled) return;
      const raw = typeof ev.data === "string" ? ev.data : "";
      try {
        const room = parseRoomInfoFromFirstMessage(raw);
        settled = true;
        window.clearTimeout(timer);
        ws.close();
        resolve(room);
      } catch {
        fail();
      }
    };

    ws.onerror = () => {
      fail();
    };

    ws.onclose = () => {
      if (!settled) fail();
    };
  });
}
