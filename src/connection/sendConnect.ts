import type {
  ConnectedPacket,
  ConnectionRefusedPacket,
  ConnectPacket,
} from "../protocol/connectPackets";

export class ConnectOutcomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectOutcomeError";
  }
}

/**
 * Sends a single Connect command array and waits for Connected or ConnectionRefused
 * in subsequent message frames (may share a batch with other packets).
 */
export function sendConnectAndAwaitOutcome(
  ws: WebSocket,
  packet: ConnectPacket,
): Promise<
  | { outcome: "connected"; connected: ConnectedPacket; connectBatchRest: unknown[] }
  | { outcome: "refused"; refused: ConnectionRefusedPacket }
> {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      reject(new ConnectOutcomeError("WebSocket is not open."));
      return;
    }

    const onMessage = (ev: MessageEvent) => {
      const raw = typeof ev.data === "string" ? ev.data : "";
      let data: unknown;
      try {
        data = JSON.parse(raw) as unknown;
      } catch {
        return;
      }
      if (!Array.isArray(data)) return;

      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        if (p === null || typeof p !== "object" || !("cmd" in p)) continue;
        const cmd = (p as { cmd?: string }).cmd;
        if (cmd === "Connected") {
          cleanup();
          const rest = data.slice(i + 1).filter((x) => x !== null && typeof x === "object");
          resolve({
            outcome: "connected",
            connected: p as ConnectedPacket,
            connectBatchRest: rest,
          });
          return;
        }
        if (cmd === "ConnectionRefused") {
          cleanup();
          resolve({
            outcome: "refused",
            refused: p as ConnectionRefusedPacket,
          });
          return;
        }
      }
    };

    const onClose = () => {
      cleanup();
      reject(new ConnectOutcomeError("Connection closed before Connect finished."));
    };

    function cleanup() {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("close", onClose);
    }

    ws.addEventListener("message", onMessage);
    ws.addEventListener("close", onClose);

    try {
      ws.send(JSON.stringify([packet]));
    } catch {
      cleanup();
      reject(new ConnectOutcomeError("Failed to send Connect packet."));
    }
  });
}
