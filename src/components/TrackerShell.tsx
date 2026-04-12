import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useState } from "react";
import type { SlotSession } from "../protocol/connectPackets";
import type { RoomInfo } from "../protocol/roomInfo";
import { useNotifyNewCheckedLocations } from "../tracker/useNotifyNewCheckedLocations";
import { useTrackerSession } from "../tracker/useTrackerSession";
import { ChecksView } from "./tracker/ChecksView";
import { HintsView } from "./tracker/HintsView";
import { OverallStatusView } from "./tracker/OverallStatusView";

export type TrackerShellProps = {
  room: RoomInfo;
  socket: WebSocket;
  slotSession: SlotSession;
  reconnecting?: boolean;
  onNotify?: (message: string) => void;
};

export function TrackerShell({
  room,
  socket,
  slotSession,
  reconnecting = false,
  onNotify,
}: TrackerShellProps) {
  const { tracker, protocolError } = useTrackerSession({ socket, slotSession, room });
  const [tab, setTab] = useState(0);

  useNotifyNewCheckedLocations(tracker, slotSession, onNotify);

  return (
    <Box sx={{ position: "relative", opacity: reconnecting ? 0.65 : 1 }}>
      {reconnecting ? (
        <LinearProgress
          sx={{
            position: "absolute",
            top: -8,
            left: 0,
            right: 0,
            borderRadius: 1,
            zIndex: 2,
          }}
        />
      ) : null}
      {protocolError ? (
        <Box sx={{ mb: 2, color: "error.main" }} role="alert">
          {protocolError}
        </Box>
      ) : null}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Status" />
        <Tab label="Checks" />
        <Tab label="Hints" />
      </Tabs>
      {!tracker ? (
        <LinearProgress />
      ) : (
        <>
          {tab === 0 ? <OverallStatusView room={room} slotSession={slotSession} tracker={tracker} /> : null}
          {tab === 1 ? <ChecksView socket={socket} slotSession={slotSession} tracker={tracker} /> : null}
          {tab === 2 ? <HintsView socket={socket} slotSession={slotSession} tracker={tracker} /> : null}
        </>
      )}
    </Box>
  );
}
