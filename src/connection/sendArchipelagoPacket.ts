/** Send one Archipelago JSON message (array of one object) over an open WebSocket. */
export function sendArchipelagoPacket(ws: WebSocket, packet: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify([packet]));
  } catch {
    /* ignore */
  }
}
