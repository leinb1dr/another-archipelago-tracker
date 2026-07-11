import { useEffect, useMemo, useState } from "react";
import type { RoomInfo } from "../protocol/roomInfo";
import {
  buildGetDataPackagePacket,
  type DataPackageContents,
  type DataPackagePacket,
} from "../protocol/serverPackets";
import { sendArchipelagoPacket } from "./sendArchipelagoPacket";

export type RoomDataPackageState = {
  status: "idle" | "loading" | "ready";
  requestedGames: string[];
  data: DataPackageContents | null;
};

function uniqueGames(games: string[]): string[] {
  return Array.from(new Set(games.map((game) => game.trim()).filter(Boolean)));
}

function isDataPackagePacket(packet: unknown): packet is DataPackagePacket {
  if (packet === null || typeof packet !== "object") return false;
  const candidate = packet as { cmd?: unknown; data?: unknown };
  return candidate.cmd === "DataPackage" && candidate.data !== null && typeof candidate.data === "object";
}

export function useRoomDataPackage(socket: WebSocket | null, room: RoomInfo | null): RoomDataPackageState {
  const requestedGames = useMemo(() => uniqueGames(room?.games ?? []), [room?.games]);
  const requestedGamesKey = requestedGames.join("\u0000");
  const [state, setState] = useState<RoomDataPackageState>({
    status: "idle",
    requestedGames: [],
    data: null,
  });

  useEffect(() => {
    if (!socket || !room) {
      setState({ status: "idle", requestedGames: [], data: null });
      return;
    }

    setState({ status: "loading", requestedGames, data: null });

    const onMessage = (ev: MessageEvent) => {
      const raw = typeof ev.data === "string" ? ev.data : "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        return;
      }
      if (!Array.isArray(parsed)) return;

      const dataPackage = parsed.find(isDataPackagePacket);
      if (!dataPackage) return;
      setState({ status: "ready", requestedGames, data: dataPackage.data });
    };

    socket.addEventListener("message", onMessage);
    sendArchipelagoPacket(socket, buildGetDataPackagePacket(requestedGames));

    return () => {
      socket.removeEventListener("message", onMessage);
    };
  }, [socket, room?.seed_name, requestedGamesKey]);

  return state;
}
