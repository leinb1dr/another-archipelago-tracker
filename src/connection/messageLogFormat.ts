/**
 * Parse an inbound WebSocket text frame (JSON array of protocol packets).
 */
export type ParsedPacketRow = {
  index: number;
  cmd: string;
  /** Pretty-printed JSON for this packet. */
  json: string;
};

export type ParsedInboundFrame =
  | { kind: "packets"; rows: ParsedPacketRow[] }
  | { kind: "text"; content: string };

export function parseInboundFrame(raw: string): ParsedInboundFrame {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      return { kind: "text", content: raw };
    }
    const rows: ParsedPacketRow[] = data.map((p, index) => {
      const cmd =
        p !== null && typeof p === "object" && "cmd" in p && typeof (p as { cmd: unknown }).cmd === "string"
          ? (p as { cmd: string }).cmd
          : "—";
      const json = JSON.stringify(p, null, 2);
      return { index, cmd, json };
    });
    return { kind: "packets", rows };
  } catch {
    return { kind: "text", content: raw };
  }
}
