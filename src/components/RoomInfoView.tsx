import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import {
  filterGameSignInsForServer,
  type RecentGameSignIn,
} from "../connection/recentGameSignInsStorage";
import {
  type MultiSlotCredentials,
} from "../connection/multiSlotSessions";
import type { RoomInfo } from "../protocol/roomInfo";
import { RegisterSlotDialog, type SlotConnectedPayload } from "./RegisterSlotDialog";

function formatVersion(v: { major: number; minor: number; build: number }): string {
  return `${v.major}.${v.minor}.${v.build}`;
}

export type RoomInfoViewProps = {
  room: RoomInfo;
  reconnecting?: boolean;
  /** Current server (must match stored entries to show saved sign-ins). */
  serverHost: string;
  serverPort: string;
  recentGameSignIns: RecentGameSignIn[];
  onDeleteGameSignIn: (entry: RecentGameSignIn) => void;
  slotConnectBusy?: boolean;
  slotConnectError?: string | null;
  onSlotConnected: (credentials: MultiSlotCredentials) => Promise<void>;
};

export function RoomInfoView({
  room,
  reconnecting = false,
  serverHost,
  serverPort,
  recentGameSignIns,
  onDeleteGameSignIn,
  slotConnectBusy = false,
  slotConnectError = null,
  onSlotConnected,
}: RoomInfoViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [quickSignInKey, setQuickSignInKey] = useState<string | null>(null);
  const [quickSignInError, setQuickSignInError] = useState<string | null>(null);

  const quickSignIn = useCallback(
    async (entry: RecentGameSignIn) => {
      const slotName = entry.slotName.trim();
      const gameTitle = entry.game.trim();
      if (!slotName || !gameTitle) return;
      setQuickSignInError(null);
      const key = `${gameTitle}:${slotName}`;
      setQuickSignInKey(key);
      try {
        await onSlotConnected({
          game: gameTitle,
          slotName,
          password: undefined,
        });
      } catch (e) {
        setQuickSignInError(e instanceof Error ? e.message : "Could not complete sign-in.");
      } finally {
        setQuickSignInKey(null);
      }
    },
    [onSlotConnected],
  );

  const savedForThisServer = useMemo(
    () => filterGameSignInsForServer(recentGameSignIns, serverHost, serverPort),
    [recentGameSignIns, serverHost, serverPort],
  );

  const serverTime =
    typeof room.time === "number" && Number.isFinite(room.time)
      ? new Date(room.time * 1000).toLocaleString()
      : "—";

  const permissionLabels: Record<string, string> = {
    release: "Release",
    collect: "Collect",
    remaining: "Remaining",
  };

  return (
    <Card variant="outlined" sx={{ position: "relative", opacity: reconnecting ? 0.6 : 1 }}>
      {reconnecting ? (
        <LinearProgress
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            borderRadius: "4px 4px 0 0",
            zIndex: 1,
          }}
        />
      ) : null}
      <CardHeader
        title="Room info"
        subheader={`Seed: ${room.seed_name}`}
        slotProps={{ title: { component: "h2" } }}
      />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
            <Chip size="small" label={room.password ? "Password required" : "No password"} variant="outlined" />
            {room.tags.map((tag) => (
              <Chip key={tag} size="small" label={tag} />
            ))}
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Server version
            </Typography>
            <Typography variant="body2">{formatVersion(room.version)}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Generator version
            </Typography>
            <Typography variant="body2">{formatVersion(room.generator_version)}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Hint cost / check points
            </Typography>
            <Typography variant="body2">
              {room.hint_cost}% · {room.location_check_points} pt(s) per check
            </Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Server time
            </Typography>
            <Typography variant="body2">{serverTime}</Typography>
          </Stack>

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Permissions
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
            {Object.entries(room.permissions).map(([key, value]) => (
              <Chip
                key={key}
                size="small"
                label={`${permissionLabels[key] ?? key}: ${String(value)}`}
                variant="outlined"
              />
            ))}
          </Stack>

          <Divider />

          {savedForThisServer.length > 0 ? (
            <>
              <Typography variant="subtitle2" color="text.secondary">
                Previously signed-in games ({savedForThisServer.length})
              </Typography>
              {quickSignInError ? (
                <Alert severity="error" role="alert" onClose={() => setQuickSignInError(null)}>
                  {quickSignInError}
                </Alert>
              ) : null}
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <List dense disablePadding>
                  {savedForThisServer.map((entry) => (
                    <ListItem
                      key={`${entry.game}:${entry.slotName}`}
                      secondaryAction={
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Button
                            type="button"
                            size="small"
                            variant="contained"
                            disabled={
                              reconnecting ||
                              Boolean(quickSignInKey) ||
                              slotConnectBusy ||
                              dialogOpen
                            }
                            onClick={() => void quickSignIn(entry)}
                          >
                            {quickSignInKey === `${entry.game.trim()}:${entry.slotName.trim()}`
                              ? "Signing in…"
                              : "Sign in"}
                          </Button>
                          <Button
                            type="button"
                            size="small"
                            color="inherit"
                            disabled={reconnecting || Boolean(quickSignInKey) || slotConnectBusy}
                            onClick={() => onDeleteGameSignIn(entry)}
                            aria-label={`Delete saved sign-in ${entry.game} ${entry.slotName}`}
                          >
                            Delete
                          </Button>
                        </Stack>
                      }
                      sx={{ pr: 22 }}
                    >
                      <ListItemText
                        primary={<Typography variant="body2">{entry.game}</Typography>}
                        secondary={
                          <Typography component="span" variant="caption" color="text.secondary">
                            Slot: {entry.slotName}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Divider />
            </>
          ) : null}

          <Typography variant="subtitle2" color="text.secondary">
            Games ({room.games.length}) — click a game to sign in
          </Typography>
          <Box
            sx={{
              maxHeight: 280,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <List dense disablePadding>
              {room.games.map((name, index) => (
                <ListItemButton
                  key={`${index}-${name}`}
                  disabled={reconnecting || Boolean(quickSignInKey)}
                  onClick={() => {
                    setSelectedGame(name);
                    setDialogOpen(true);
                  }}
                >
                  <ListItemText primary={<Typography variant="body2">{name}</Typography>} />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {room.datapackage_checksums && Object.keys(room.datapackage_checksums).length > 0 ? (
            <>
              <Typography variant="caption" color="text.secondary">
                Data package checksums: {Object.keys(room.datapackage_checksums).length}{" "}
                {Object.keys(room.datapackage_checksums).length === 1 ? "entry" : "entries"}
              </Typography>
            </>
          ) : null}
        </Stack>
      </CardContent>

      <RegisterSlotDialog
        open={dialogOpen && !reconnecting}
        gameTitle={selectedGame}
        submitting={slotConnectBusy}
        errorMessage={slotConnectError}
        onClose={() => {
          setDialogOpen(false);
          setSelectedGame(null);
        }}
        onConnected={async ({ credentials }: SlotConnectedPayload) => {
          await onSlotConnected(credentials);
        }}
      />
    </Card>
  );
}
