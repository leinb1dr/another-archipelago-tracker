import { useCallback, useEffect, useState } from "react";

export type InboundLogEntry = {
  id: string;
  receivedAt: number;
  raw: string;
};

const MAX_INBOUND_LOG_ENTRIES = 500;

function nextEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useInboundMessageLog(
  socket: WebSocket | null,
  seedRaw: string | null,
): {
  entries: InboundLogEntry[];
  clear: () => void;
} {
  const [entries, setEntries] = useState<InboundLogEntry[]>([]);

  useEffect(() => {
    if (!socket) {
      setEntries([]);
      return;
    }

    const initial: InboundLogEntry[] = [];
    if (seedRaw) {
      initial.push({
        id: nextEntryId(),
        receivedAt: Date.now(),
        raw: seedRaw,
      });
    }
    setEntries(initial);

    const onMessage = (ev: MessageEvent) => {
      const raw = typeof ev.data === "string" ? ev.data : "[non-text frame]";
      setEntries((prev) => {
        const next: InboundLogEntry[] = [
          ...prev,
          { id: nextEntryId(), receivedAt: Date.now(), raw },
        ];
        if (next.length <= MAX_INBOUND_LOG_ENTRIES) return next;
        return next.slice(-MAX_INBOUND_LOG_ENTRIES);
      });
    };

    socket.addEventListener("message", onMessage);
    return () => {
      socket.removeEventListener("message", onMessage);
    };
  }, [socket, seedRaw]);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  return { entries, clear };
}
