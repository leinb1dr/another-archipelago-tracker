/** Normalize user-entered host and build WebSocket URL. */

export function normalizeHost(input: string): string {
  let h = input.trim();
  h = h.replace(/^https?:\/\//i, "");
  h = h.replace(/^wss?:\/\//i, "");
  const beforeSlash = h.split("/")[0] ?? "";
  return beforeSlash;
}

function isLoopbackHost(normalizedHost: string): boolean {
  const h = normalizedHost.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

/**
 * Remote Archipelago servers use `wss://`. Loopback (`localhost`, `127.0.0.1`, …)
 * uses `ws://` so local integration tests can run a plain WebSocket server without TLS.
 */
export function buildArchipelagoWsUrl(host: string, port: string): string {
  const h = normalizeHost(host);
  const p = port.trim();
  const scheme = isLoopbackHost(h) ? "ws" : "wss";
  return `${scheme}://${h}:${p}/`;
}
