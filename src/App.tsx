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
import { ConnectionView } from "./components/ConnectionView";
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

function App() {
  const [host, setHost] = useState(DEFAULT_HOST);
  const [port, setPort] = useState("");
  const [hostError, setHostError] = useState("");
  const [portError, setPortError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [sessionSocket, setSessionSocket] = useState<WebSocket | null>(null);
  const [slotSession, setSlotSession] = useState<SlotSession | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [roomReconnecting, setRoomReconnecting] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      sessionSocket?.close();
    };
  }, [sessionSocket]);

  const handleConnect = useCallback(async () => {
    const he = validateHost(host);
    const pe = validatePort(port);
    setHostError(he);
    setPortError(pe);
    if (he || pe) return;

    setFormError(null);
    setConnecting(true);
    try {
      const url = buildArchipelagoWsUrl(host, port);
      const { room: nextRoom, socket } = await connectAndAwaitRoomInfo(url);
      setSlotSession(null);
      setRoom(nextRoom);
      setSessionSocket(socket);
    } catch (e) {
      const msg = e instanceof Error ? e.message : CONNECTION_FAILED_MESSAGE;
      setFormError(msg);
    } finally {
      setConnecting(false);
    }
  }, [host, port]);

  const performSlotLogout = useCallback(async () => {
    if (!sessionSocket) return;
    setSessionDialogOpen(false);
    setSlotSession(null);
    setRoomReconnecting(true);
    sessionSocket.close();
    try {
      const url = buildArchipelagoWsUrl(host, port);
      const { room: nextRoom, socket } = await connectAndAwaitRoomInfo(url);
      setRoom(nextRoom);
      setSessionSocket(socket);
      setSnackbarMessage("Reconnected to room. You can sign in to a slot when ready.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : CONNECTION_FAILED_MESSAGE;
      setRoom(null);
      setSessionSocket(null);
      setFormError(msg);
    } finally {
      setRoomReconnecting(false);
    }
  }, [host, port, sessionSocket]);

  return (
    <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Archipelago Tracker
          </Typography>
          {slotSession ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", maxWidth: "min(100%, 420px)" }}>
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
                title={`${slotSession.displayName} · ${slotSession.game}`}
              >
                {slotSession.displayName} · {slotSession.game}
              </Typography>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                disabled={roomReconnecting}
                onClick={() => setSessionDialogOpen(true)}
                sx={{ borderColor: "rgba(255,255,255,0.5)", flexShrink: 0 }}
              >
                Log out
              </Button>
            </Stack>
          ) : null}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {room && sessionSocket ? (
          slotSession ? (
            <TrackerShell
              room={room}
              socket={sessionSocket}
              slotSession={slotSession}
              reconnecting={roomReconnecting}
            />
          ) : (
            <RoomInfoView
              room={room}
              socket={sessionSocket}
              reconnecting={roomReconnecting}
              onSlotConnected={({ message, session }) => {
                setSnackbarMessage(message);
                setSlotSession(session);
              }}
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
          />
        )}
      </Container>

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

      {slotSession ? (
        <SessionStatusDialog
          open={sessionDialogOpen}
          room={room}
          slotSession={slotSession}
          onClose={() => setSessionDialogOpen(false)}
          onLogout={performSlotLogout}
        />
      ) : null}
    </Box>
  );
}

export default App;
