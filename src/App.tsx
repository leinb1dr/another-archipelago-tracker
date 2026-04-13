import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import {
  buildArchipelagoWsUrl,
  normalizeHost,
} from "./connection/buildWsUrl";
import {
  CONNECTION_FAILED_MESSAGE,
  connectAndAwaitRoomInfo,
} from "./connection/connectArchipelago";
import {
  connectSlotSession,
  type MultiSlotCredentials,
} from "./connection/multiSlotSessions";
import { useInboundMessageLog } from "./connection/useInboundMessageLog";
import {
  loadRecentGameSignIns,
  removeRecentGameSignIn,
  upsertRecentGameSignIn,
  type RecentGameSignIn,
} from "./connection/recentGameSignInsStorage";
import {
  loadRecentConnections,
  removeRecentConnection,
  upsertRecentConnection,
  type RecentConnection,
} from "./connection/recentConnectionsStorage";
import { ConnectionView } from "./components/ConnectionView";
import { MessageLogPanel } from "./components/MessageLogPanel";
import { RoomInfoView } from "./components/RoomInfoView";
import { SessionStatusDialog } from "./components/SessionStatusDialog";
import { TrackerShell } from "./components/TrackerShell";
import type { SlotSession } from "./protocol/connectPackets";
import type { RoomInfo } from "./protocol/roomInfo";

function validateHost(host: string): string {
  if (!normalizeHost(host)) return "Host is required.";
  return "";
}

function validatePort(port: string): string {
  const t = port.trim();
  if (!t) return "Port is required.";
  if (!/^\d+$/.test(t)) return "Port must be a number.";
  const n = Number(t);
  if (n < 1 || n > 65535) return "Port must be between 1 and 65535.";
  return "";
}

const DEFAULT_HOST = "archipelago.gg";

type SlotSessionEntry = {
  key: string;
  socket: WebSocket;
  session: SlotSession;
  slotNameUsed: string;
};

function App() {
  const [host, setHost] = useState(DEFAULT_HOST);
  const [port, setPort] = useState("");
  const [hostError, setHostError] = useState("");
  const [portError, setPortError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [roomSocket, setRoomSocket] = useState<WebSocket | null>(null);
  const [slotSessions, setSlotSessions] = useState<SlotSessionEntry[]>([]);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [slotConnectBusy, setSlotConnectBusy] = useState(false);
  const [slotConnectError, setSlotConnectError] = useState<string | null>(null);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [recentConnections, setRecentConnections] = useState<RecentConnection[]>([]);
  const [recentGameSignIns, setRecentGameSignIns] = useState<RecentGameSignIn[]>([]);
  const [sessionHandshakeRaw, setSessionHandshakeRaw] = useState<string | null>(null);

  const { entries: messageLogEntries, clear: clearMessageLog } = useInboundMessageLog(
    roomSocket,
    sessionHandshakeRaw,
  );

  const activeSlotEntry = slotSessions.find((entry) => entry.key === activeSlotKey) ?? null;
  const visibleSlotKey = activeSlotEntry?.key ?? slotSessions[0]?.key ?? null;
  const registeredGames = Array.from(new Set(slotSessions.map((entry) => entry.session.game)));

  useEffect(() => {
    setRecentConnections(loadRecentConnections());
    setRecentGameSignIns(loadRecentGameSignIns());
  }, []);

  useEffect(() => {
    return () => {
      roomSocket?.close();
      for (const entry of slotSessions) entry.socket.close();
    };
  }, [roomSocket, slotSessions]);

  const runConnect = useCallback(async (hostRaw: string, portRaw: string) => {
    const he = validateHost(hostRaw);
    const pe = validatePort(portRaw);
    setHostError(he);
    setPortError(pe);
    if (he || pe) return;

    const nextHost = normalizeHost(hostRaw);
    const nextPort = portRaw.trim();
    setHost(nextHost);
    setPort(nextPort);

    setFormError(null);
    setConnecting(true);
    try {
      const url = buildArchipelagoWsUrl(nextHost, nextPort);
      const { room: nextRoom, socket, firstMessageRaw } = await connectAndAwaitRoomInfo(url);
      setActiveSlotKey(null);
      setShowRoomInfo(false);
      setSlotSessions((prev) => {
        for (const entry of prev) entry.socket.close();
        return [];
      });
      roomSocket?.close();
      setRoom(nextRoom);
      setSessionHandshakeRaw(firstMessageRaw);
      setRoomSocket(socket);
      upsertRecentConnection(nextHost, nextPort);
      setRecentConnections(loadRecentConnections());
    } catch (e) {
      const msg = e instanceof Error ? e.message : CONNECTION_FAILED_MESSAGE;
      setFormError(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleConnect = useCallback(() => {
    void runConnect(host, port);
  }, [host, port, runConnect]);

  const performSlotLogout = useCallback(() => {
    if (!activeSlotEntry) return;
    setSessionDialogOpen(false);
    activeSlotEntry.socket.close();
    setSlotSessions((prev) => prev.filter((entry) => entry.key !== activeSlotEntry.key));
    setActiveSlotKey((prev) => {
      if (prev !== activeSlotEntry.key) return prev;
      const remaining = slotSessions.filter((entry) => entry.key !== activeSlotEntry.key);
      return remaining[0]?.key ?? null;
    });
    setSnackbarMessage(`Logged out ${activeSlotEntry.session.displayName}.`);
  }, [activeSlotEntry, slotSessions]);

  const registerSlot = useCallback(
    async (credentials: MultiSlotCredentials) => {
      if (!room) throw new Error("Room info is unavailable.");
      setSlotConnectBusy(true);
      setSlotConnectError(null);
      try {
        const { socket, session } = await connectSlotSession(host, port, room.version, credentials);
        const key = `${session.connected.team}:${session.connected.slot}`;
        setSlotSessions((prev) => {
          const existing = prev.find((entry) => entry.key === key);
          if (existing) existing.socket.close();
          const next = prev.filter((entry) => entry.key !== key);
          return [...next, { key, socket, session, slotNameUsed: credentials.slotName }];
        });
        setActiveSlotKey(key);
        upsertRecentGameSignIn({
          host,
          port,
          game: session.game,
          slotName: credentials.slotName,
        });
        setRecentGameSignIns(loadRecentGameSignIns());
        setSnackbarMessage(`Connected as ${session.displayName}.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not complete sign-in.";
        setSlotConnectError(message);
        throw error;
      } finally {
        setSlotConnectBusy(false);
      }
    },
    [host, port, room],
  );

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "baseline", minWidth: 0, flexShrink: 1 }}
          >
            <Typography variant="h6" component="h1" sx={{ flexShrink: 0 }}>
              Archipelago Tracker
            </Typography>
            {roomSocket ? (
              <Typography
                component="span"
                variant="body2"
                color="inherit"
                sx={{
                  opacity: 0.85,
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  maxWidth: { xs: 140, sm: 280, md: 360 },
                }}
                title={`${host}:${port}`}
              >
                {host}:{port}
              </Typography>
            ) : null}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          {activeSlotEntry ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", maxWidth: "min(100%, 420px)" }}>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={() => {
                  const index = slotSessions.findIndex((entry) => entry.key === activeSlotEntry.key);
                  if (index < 0 || slotSessions.length < 2) return;
                  const next = slotSessions[(index + 1) % slotSessions.length];
                  setActiveSlotKey(next.key);
                }}
                sx={{ borderColor: "rgba(255,255,255,0.5)", flexShrink: 0 }}
                disabled={slotSessions.length < 2}
              >
                Slot {activeSlotEntry.session.connected.slot} ({slotSessions.length})
              </Button>
              <Typography
                variant="body2"
                color="inherit"
                sx={{
                  opacity: 0.95,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: { xs: 140, sm: 360 },
                }}
                title={`${activeSlotEntry.session.displayName} · ${activeSlotEntry.session.game}`}
              >
                {activeSlotEntry.session.displayName} · {activeSlotEntry.session.game}
              </Typography>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                onClick={() => setShowRoomInfo((prev) => !prev)}
                sx={{ borderColor: "rgba(255,255,255,0.5)", flexShrink: 0 }}
              >
                Add slot
              </Button>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                onClick={() => setSessionDialogOpen(true)}
                sx={{ borderColor: "rgba(255,255,255,0.5)", flexShrink: 0 }}
              >
                Log out
              </Button>
            </Stack>
          ) : null}
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {room && roomSocket ? (
          <MessageLogPanel entries={messageLogEntries} onClear={clearMessageLog} />
        ) : null}
        <Container
          maxWidth="md"
          sx={{
            py: 4,
            flex: 1,
            minWidth: 0,
          }}
        >
          {room && roomSocket ? (
            slotSessions.length > 0 ? (
              <>
                {slotSessions.map((entry) => (
                  <Box key={entry.key} sx={{ display: entry.key === visibleSlotKey ? "block" : "none" }}>
                    <TrackerShell
                      room={room}
                      socket={entry.socket}
                      slotSession={entry.session}
                      onNotify={setSnackbarMessage}
                      registeredGames={registeredGames}
                    />
                  </Box>
                ))}
                {showRoomInfo ? (
                  <Box sx={{ mt: 2 }}>
                    <RoomInfoView
                      room={room}
                      serverHost={host}
                      serverPort={port}
                      recentGameSignIns={recentGameSignIns}
                      slotConnectBusy={slotConnectBusy}
                      slotConnectError={slotConnectError}
                      onDeleteGameSignIn={(entry) => {
                        removeRecentGameSignIn(entry);
                        setRecentGameSignIns(loadRecentGameSignIns());
                      }}
                      onSlotConnected={registerSlot}
                    />
                  </Box>
                ) : null}
              </>
            ) : (
              <RoomInfoView
                room={room}
                serverHost={host}
                serverPort={port}
                recentGameSignIns={recentGameSignIns}
                slotConnectBusy={slotConnectBusy}
                slotConnectError={slotConnectError}
                onDeleteGameSignIn={(entry) => {
                  removeRecentGameSignIn(entry);
                  setRecentGameSignIns(loadRecentGameSignIns());
                }}
                onSlotConnected={registerSlot}
              />
            )
          ) : (
            <ConnectionView
              host={host}
              port={port}
              hostError={hostError}
              portError={portError}
              connecting={connecting}
              formError={formError}
              recentConnections={recentConnections}
              onHostChange={(v) => {
                setHost(v);
                if (hostError) setHostError("");
                if (formError) setFormError(null);
              }}
              onPortChange={(v) => {
                setPort(v);
                if (portError) setPortError("");
                if (formError) setFormError(null);
              }}
              onSubmit={handleConnect}
              onConnectRecent={(rec) => {
                void runConnect(rec.host, rec.port);
              }}
              onDeleteRecent={(rec) => {
                removeRecentConnection(rec.host, rec.port);
                setRecentConnections(loadRecentConnections());
              }}
            />
          )}
        </Container>
      </Box>

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={8000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarMessage(null)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {activeSlotEntry ? (
        <SessionStatusDialog
          open={sessionDialogOpen}
          room={room}
          slotSession={activeSlotEntry.session}
          onClose={() => setSessionDialogOpen(false)}
          onLogout={performSlotLogout}
        />
      ) : null}
    </Box>
  );
}

export default App;
