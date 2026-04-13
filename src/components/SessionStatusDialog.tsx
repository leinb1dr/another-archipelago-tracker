import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { RoomInfo } from "../protocol/roomInfo";
import type { SlotSession } from "../protocol/connectPackets";

export type SessionStatusDialogProps = {
  open: boolean;
  room: RoomInfo | null;
  slotSession: SlotSession;
  onClose: () => void;
  onLogout: () => void;
};

export function SessionStatusDialog({
  open,
  room,
  slotSession,
  onClose,
  onLogout,
}: SessionStatusDialogProps) {
  const { connected, game, displayName } = slotSession;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="session-status-title"
    >
      <DialogTitle id="session-status-title">Session</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Room seed
            </Typography>
            <Typography variant="body2">{room?.seed_name ?? "—"}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Signed in as
            </Typography>
            <Typography variant="body2">{displayName}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Game
            </Typography>
            <Typography variant="body2">{game}</Typography>
          </Stack>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 3 }}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Slot
              </Typography>
              <Typography variant="body2">{connected.slot}</Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                Team
              </Typography>
              <Typography variant="body2">{connected.team}</Typography>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Logging out closes this slot session only. You can keep tracking other registered
            slots or sign in again from room info.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button color="error" variant="contained" onClick={onLogout}>
          Log out
        </Button>
      </DialogActions>
    </Dialog>
  );
}
