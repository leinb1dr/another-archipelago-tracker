import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useCallback, useEffect, useState } from "react";
import { sendConnectAndAwaitOutcome } from "../connection/sendConnect";
import {
  buildConnectPacket,
  findPlayerForSlot,
  type SlotSession,
} from "../protocol/connectPackets";
import type { NetworkVersion } from "../protocol/roomInfo";

export type SlotConnectedPayload = {
  message: string;
  session: SlotSession;
  /** Connect packet `name` (trimmed), for local storage — not the display alias. */
  slotNameUsed: string;
};

export type RegisterSlotDialogProps = {
  open: boolean;
  gameTitle: string | null;
  socket: WebSocket | null;
  version: NetworkVersion;
  onClose: () => void;
  onConnected: (payload: SlotConnectedPayload) => void;
};

export function RegisterSlotDialog({
  open,
  gameTitle,
  socket,
  version,
  onClose,
  onConnected,
}: RegisterSlotDialogProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !gameTitle) return;
    setName("");
    setPassword("");
    setNameError("");
    setDialogError(null);
  }, [open, gameTitle]);

  const resetFields = useCallback(() => {
    setName("");
    setPassword("");
    setNameError("");
    setDialogError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!submitting) {
      resetFields();
      onClose();
    }
  }, [submitting, onClose, resetFields]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Slot name is required.");
      return;
    }
    setNameError("");
    if (!socket || socket.readyState !== WebSocket.OPEN || !gameTitle) {
      setDialogError("Connection is not available.");
      return;
    }

    setDialogError(null);
    setSubmitting(true);
    try {
      const packet = buildConnectPacket({
        name: trimmed,
        game: gameTitle,
        password: password.trim() || undefined,
        version,
      });
      const result = await sendConnectAndAwaitOutcome(socket, packet);
      if (result.outcome === "refused") {
        const errs = result.refused.errors?.length
          ? result.refused.errors.join(", ")
          : "Connection refused.";
        setDialogError(errs);
        return;
      }
      const player = findPlayerForSlot(result.connected);
      const display = player?.alias ?? player?.name ?? trimmed;
      const session: SlotSession = {
        game: gameTitle,
        displayName: display,
        connected: result.connected,
        connectBatchRest: result.connectBatchRest,
      };
      onConnected({
        message: `Connected as ${display}.`,
        session,
        slotNameUsed: trimmed,
      });
      resetFields();
      onClose();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Could not complete sign-in.");
    } finally {
      setSubmitting(false);
    }
  }, [gameTitle, name, onClose, onConnected, password, resetFields, socket, version]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" aria-labelledby="register-slot-title">
      <DialogTitle id="register-slot-title">Register slot</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {gameTitle ? (
            <Alert severity="info" variant="outlined">
              Game: <strong>{gameTitle}</strong>
            </Alert>
          ) : null}
          {dialogError ? (
            <Alert severity="error" role="alert">
              {dialogError}
            </Alert>
          ) : null}
          <TextField
            label="Slot name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
              if (dialogError) setDialogError(null);
            }}
            error={Boolean(nameError)}
            helperText={nameError || " "}
            required
            fullWidth
            disabled={submitting}
            autoComplete="username"
            slotProps={{ htmlInput: { "aria-label": "Slot name" } }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (dialogError) setDialogError(null);
            }}
            helperText="Optional — only if the slot has a password."
            fullWidth
            disabled={submitting}
            autoComplete="current-password"
            slotProps={{ htmlInput: { "aria-label": "Password" } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
