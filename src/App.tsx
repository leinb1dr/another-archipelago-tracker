import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Snackbar from "@mui/material/Snackbar";
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
      setRoom(nextRoom);
      setSessionSocket(socket);
    } catch (e) {
      const msg = e instanceof Error ? e.message : CONNECTION_FAILED_MESSAGE;
      setFormError(msg);
    } finally {
      setConnecting(false);
    }
  }, [host, port]);

  return (
    <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Archipelago Tracker
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {room && sessionSocket ? (
          <RoomInfoView
            room={room}
            socket={sessionSocket}
            onSlotConnected={(message) => setSnackbarMessage(message)}
          />
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
    </Box>
  );
}

export default App;
