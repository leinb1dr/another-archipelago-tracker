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

export type RoomSocketSession = {
  room: RoomInfo;
  socket: WebSocket;
};

/**
 * Opens a WebSocket, enforces {@link CONNECT_TIMEOUT_MS} for the initial handshake,
 * reads the first text frame as `RoomInfo`, and **keeps the socket open** for
 * follow-up packets such as `Connect` / `Connected`.
 */
export function connectAndAwaitRoomInfo(url: string): Promise<RoomSocketSession> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(url);

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

    const onFirstMessage = (ev: MessageEvent) => {
      if (settled) return;
      const raw = typeof ev.data === "string" ? ev.data : "";
      try {
        const room = parseRoomInfoFromFirstMessage(raw);
        settled = true;
        window.clearTimeout(timer);
        ws.removeEventListener("message", onFirstMessage);
        resolve({ room, socket: ws });
      } catch {
        fail();
      }
    };

    ws.addEventListener("message", onFirstMessage);

    ws.onerror = () => {
      fail();
    };

    ws.onclose = () => {
      if (!settled) fail();
    };
  });
}
