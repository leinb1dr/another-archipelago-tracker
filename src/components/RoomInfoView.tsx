import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import {
  filterGameSignInsForServer,
  type RecentGameSignIn,
} from "../connection/recentGameSignInsStorage";
import {
  type MultiSlotCredentials,
} from "../connection/multiSlotSessions";
import type { RoomDataPackageState } from "../connection/useRoomDataPackage";
import type { RoomInfo } from "../protocol/roomInfo";
import { summarizeRoomDataPackage, type RoomProgressSummary } from "../tracker/roomProgressSummary";
import { RegisterSlotDialog, type SlotConnectedPayload } from "./RegisterSlotDialog";

function formatVersion(v: { major: number; minor: number; build: number }): string {
  return `${v.major}.${v.minor}.${v.build}`;
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{children}</Typography>
    </Stack>
  );
}

function MetricItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" component="p" sx={{ lineHeight: 1.2 }}>
        {children}
      </Typography>
    </Stack>
  );
}

function RoomTrackingOverview({
  status,
  summary,
}: {
  status: RoomDataPackageState["status"] | "cached";
  summary: RoomProgressSummary;
}) {
  const hasTotals = status === "ready" || status === "cached";
  const statusLabel =
    status === "ready"
      ? "Data package loaded"
      : status === "cached"
        ? "Cached totals"
      : status === "loading"
        ? "Loading data package"
        : "RoomInfo only";
  const statusColor = status === "ready" ? "success" : status === "cached" ? "info" : "default";

  return (
    <Box
      component="section"
      aria-label="Room tracking"
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" useFlexGap sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography variant="h6" component="h3">
            Room tracking
          </Typography>
          <Chip size="small" label={statusLabel} color={statusColor} variant="outlined" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Before game sign-in, the room socket can load RoomInfo and GetDataPackage. Totals are cached per seed;
          completed and remaining checks arrive after slot sign-in via Connected and RoomUpdate.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <MetricItem label="Known checks">
            {hasTotals ? summary.locationCount.toLocaleString() : "Loading..."}
          </MetricItem>
          <MetricItem label="Known items">{hasTotals ? summary.itemCount.toLocaleString() : "Loading..."}</MetricItem>
          <MetricItem label="Data package games">
            {hasTotals ? `${summary.loadedGameCount}/${summary.requestedGameCount}` : "Loading..."}
          </MetricItem>
          <MetricItem label="Completed checks">Slot sign-in required</MetricItem>
        </Box>
        {hasTotals && summary.games.length > 0 ? (
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
            {summary.games.map((game) => (
              <Chip
                key={game.game}
                size="small"
                label={
                  game.loaded
                    ? `${game.game}: ${game.locationCount.toLocaleString()} checks`
                    : `${game.game}: not loaded`
                }
                variant="outlined"
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

export type RoomInfoViewProps = {
  room: RoomInfo;
  reconnecting?: boolean;
  compact?: boolean;
  /** Current server (must match stored entries to show saved sign-ins). */
  serverHost: string;
  serverPort: string;
  recentGameSignIns: RecentGameSignIn[];
  roomDataPackage?: RoomDataPackageState;
  cachedRoomProgressSummary?: RoomProgressSummary | null;
  connectedSlotSignIns?: Array<{
    game: string;
    slotName: string;
    displayName: string;
    color?: string;
  }>;
  onDeleteGameSignIn: (entry: RecentGameSignIn) => void;
  slotConnectBusy?: boolean;
  slotConnectError?: string | null;
  onSlotConnected: (credentials: MultiSlotCredentials) => Promise<void>;
  onSlotLogout?: (entry: RecentGameSignIn) => void;
};

export function RoomInfoView({
  room,
  reconnecting = false,
  compact = false,
  serverHost,
  serverPort,
  recentGameSignIns,
  roomDataPackage,
  cachedRoomProgressSummary,
  connectedSlotSignIns = [],
  onDeleteGameSignIn,
  slotConnectBusy = false,
  slotConnectError = null,
  onSlotConnected,
  onSlotLogout,
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
  const connectedBySavedKey = useMemo(() => {
    const map = new Map<string, { displayName: string; color?: string }>();
    for (const entry of connectedSlotSignIns) {
      map.set(`${entry.game.trim()}:${entry.slotName.trim()}`, {
        displayName: entry.displayName,
        color: entry.color,
      });
    }
    return map;
  }, [connectedSlotSignIns]);

  const serverTime =
    typeof room.time === "number" && Number.isFinite(room.time)
      ? new Date(room.time * 1000).toLocaleString()
      : "—";
  const datapackageChecksumCount = room.datapackage_checksums
    ? Object.keys(room.datapackage_checksums).length
    : 0;
  const hasFreshProgressSummary = Boolean(roomDataPackage?.data);
  const progressSummary = useMemo(() => {
    if (roomDataPackage?.data) return summarizeRoomDataPackage(room.games, roomDataPackage.data);
    return cachedRoomProgressSummary ?? summarizeRoomDataPackage(room.games, null);
  }, [room.games, roomDataPackage?.data, cachedRoomProgressSummary]);
  const progressStatus =
    hasFreshProgressSummary
      ? (roomDataPackage?.status ?? "idle")
      : cachedRoomProgressSummary
        ? "cached"
        : (roomDataPackage?.status ?? "idle");

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
        title={compact ? "Add slot" : "Choose a game"}
        subheader={compact ? undefined : "Pick the game that matches your Archipelago slot."}
        slotProps={{ title: { component: "h2" } }}
      />
      <CardContent>
        <Stack spacing={2}>
          <RoomTrackingOverview status={progressStatus} summary={progressSummary} />

          <Stack spacing={1}>
            <Stack spacing={0.25}>
              <Typography variant="h6" component="h3">
                Games ({room.games.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a game to sign in with your slot name.
              </Typography>
            </Stack>
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
          </Stack>

          {savedForThisServer.length > 0 ? (
            <>
              <Divider />
              <Stack spacing={0.25}>
                <Typography variant="h6" component="h3">
                  Previous sessions ({savedForThisServer.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reuse a saved game and slot name for this server.
                </Typography>
              </Stack>
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
                    (() => {
                      const savedKey = `${entry.game.trim()}:${entry.slotName.trim()}`;
                      const connected = connectedBySavedKey.get(savedKey);
                      return (
                        <ListItem
                          key={`${entry.game}:${entry.slotName}`}
                          secondaryAction={
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              {connected ? (
                                <Button
                                  type="button"
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  disabled={reconnecting || Boolean(quickSignInKey) || slotConnectBusy || dialogOpen}
                                  onClick={() => onSlotLogout?.(entry)}
                                  aria-label={`Log out saved sign-in ${entry.game} ${entry.slotName}`}
                                >
                                  Log out
                                </Button>
                              ) : (
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
                                  aria-label={`Sign in saved sign-in ${entry.game} ${entry.slotName}`}
                                >
                                  {quickSignInKey === `${entry.game.trim()}:${entry.slotName.trim()}`
                                    ? "Signing in…"
                                    : "Sign in"}
                                </Button>
                              )}
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
                            slotProps={{ secondary: { component: "div" } }}
                            secondary={
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                <Typography component="span" variant="caption" color="text.secondary">
                                  Slot: {entry.slotName}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={connected ? `Connected (${connected.displayName})` : "Disconnected"}
                                  color={connected ? "success" : "default"}
                                  variant={connected ? "filled" : "outlined"}
                                  sx={
                                    connected?.color
                                      ? {
                                          borderLeft: 4,
                                          borderColor: connected.color,
                                          pl: 0.75,
                                        }
                                      : undefined
                                  }
                                />
                              </Stack>
                            }
                          />
                        </ListItem>
                      );
                    })()
                  ))}
                </List>
              </Box>
            </>
          ) : null}

          {!compact ? (
            <Accordion
              variant="outlined"
              disableGutters
              sx={{
                "&:before": { display: "none" },
                borderRadius: 1,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="room-details-content"
                id="room-details-header"
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">Server details</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Seed: {room.seed_name}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Chip
                      size="small"
                      label={room.password ? "Password required" : "No password"}
                      variant="outlined"
                    />
                    {room.tags.map((tag) => (
                      <Chip key={tag} size="small" label={tag} />
                    ))}
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                    }}
                  >
                    <DetailItem label="Server version">{formatVersion(room.version)}</DetailItem>
                    <DetailItem label="Generator version">{formatVersion(room.generator_version)}</DetailItem>
                    <DetailItem label="Hint cost / check points">
                      {room.hint_cost}% · {room.location_check_points} pt(s) per check
                    </DetailItem>
                    <DetailItem label="Server time">{serverTime}</DetailItem>
                  </Box>

                  <Stack spacing={1}>
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
                  </Stack>

                  {datapackageChecksumCount > 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Data package checksums: {datapackageChecksumCount}{" "}
                      {datapackageChecksumCount === 1 ? "entry" : "entries"}
                    </Typography>
                  ) : null}
                </Stack>
              </AccordionDetails>
            </Accordion>
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
