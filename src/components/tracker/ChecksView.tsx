import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { sendArchipelagoPacket } from "../../connection/sendArchipelagoPacket";
import type { SlotSession } from "../../protocol/connectPackets";
import {
  buildLocationScoutsPacket,
  LOCATION_SCOUT_CREATE_AS_HINT,
  type HintPacket,
} from "../../protocol/serverPackets";
import { buildCheckRows, groupRowsByLabel } from "../../tracker/checksGrouping";
import { hintStatusChips, itemClassificationChipSpecs } from "../../tracker/hintUtils";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import { playerAlias, resolveItemName, resolveLocationName } from "../../tracker/resolveNames";
import { accentColorForNetworkSlot } from "../../connection/slotConnectionColorsStorage";
import { gameForHintItem, gameForHintLocation } from "../../tracker/slotGames";
import { GameNameCaption } from "./GameNameCaption";

export type ChecksViewProps = {
  socket: WebSocket;
  slotSession: SlotSession;
  tracker: TrackerRuntimeState;
  registeredGames?: string[];
  connectionColorsByTeamSlot?: ReadonlyMap<string, string>;
};

function hintsByLocationForFinder(hints: HintPacket[], finderSlot: number): Map<number, HintPacket[]> {
  const m = new Map<number, HintPacket[]>();
  for (const h of hints) {
    if (h.finding_player !== finderSlot) continue;
    const list = m.get(h.location) ?? [];
    list.push(h);
    m.set(h.location, list);
  }
  return m;
}

function formatNetworkId(id: number): string {
  if (id <= 0) return `(special #${id})`;
  return `#${id}`;
}

/** 0 = Received, 1 = Sent */
const SUB_TAB_RECEIVED = 0;
const SUB_TAB_SENT = 1;

const SCOUT_TIMEOUT_MS = 12_000;

type SentCheckDetailLineProps = {
  prefix: "Scout" | "Hint";
  itemText: string;
  forPlayerName: string;
  flags: number | undefined;
  /** Hint status when `includeStatusChips` is true. */
  status: number | undefined;
  /** Scouts omit hint-status chips; hints show them. */
  includeStatusChips: boolean;
};

function SentCheckDetailLine({
  prefix,
  itemText,
  forPlayerName,
  flags,
  status,
  includeStatusChips,
}: SentCheckDetailLineProps) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Typography variant="caption" color="text.secondary" component="span">
        {prefix}: {itemText}
        {" · "}
        For {forPlayerName}
      </Typography>
      {itemClassificationChipSpecs(flags).map((spec) => (
        <Chip key={spec.key} size="small" label={spec.label} variant="outlined" sx={spec.sx} />
      ))}
      {includeStatusChips
        ? hintStatusChips(status).map((spec) => (
            <Chip
              key={spec.key}
              size="small"
              label={spec.label}
              variant="outlined"
              color={spec.color}
            />
          ))
        : null}
    </Stack>
  );
}

export function ChecksView({
  socket,
  slotSession,
  tracker,
  registeredGames = [],
  connectionColorsByTeamSlot,
}: ChecksViewProps) {
  const {
    location,
    mapsByGame,
    locationGroups,
    hints,
    players,
    slotGames,
    receivedItems,
    receivedItemsSyncError,
    scoutedLocations,
  } = tracker;
  const maps = mapsByGame[slotSession.game];
  const registeredGameSet = new Set(registeredGames);
  const [subTab, setSubTab] = useState(SUB_TAB_RECEIVED);
  const [querySent, setQuerySent] = useState("");
  const [queryReceived, setQueryReceived] = useState("");
  const [hideFinished, setHideFinished] = useState(true);
  const [scoutingLocationId, setScoutingLocationId] = useState<number | null>(null);

  const rows = useMemo(() => {
    if (!maps) return [];
    return buildCheckRows({
      checkedIds: location.checkedLocationIds,
      missingIds: location.missingLocationIds,
      maps,
      locationGroups,
    });
  }, [location, maps, locationGroups]);

  const rowsForSent = useMemo(() => {
    if (!hideFinished) return rows;
    return rows.filter((r) => !r.checked);
  }, [rows, hideFinished]);

  const byLocHint = useMemo(
    () => hintsByLocationForFinder(hints, tracker.slot),
    [hints, tracker.slot],
  );

  const filteredRows = useMemo(() => {
    const q = querySent.trim().toLowerCase();
    if (!q) return rowsForSent;
    return rowsForSent.filter((r) => r.name.toLowerCase().includes(q));
  }, [rowsForSent, querySent]);

  const grouped = useMemo(() => groupRowsByLabel(filteredRows), [filteredRows]);

  useEffect(() => {
    if (scoutingLocationId === null) return;
    if (scoutedLocations[scoutingLocationId]?.length) {
      setScoutingLocationId(null);
    }
  }, [scoutingLocationId, scoutedLocations]);

  const receivedRows = useMemo(() => {
    return receivedItems.map((rec, index) => {
      const ni = rec.item;
      const seen = new Date(rec.firstSeenAt);
      const dateLabel = seen.toLocaleDateString();
      const timeLabel = seen.toLocaleTimeString();
      const finderGame = gameForHintLocation(slotGames, ni.player);
      const itemLabel =
        ni.item <= 0
          ? formatNetworkId(ni.item)
          : resolveItemName(mapsByGame, ni.item, slotSession.game);
      const locLabel =
        ni.location <= 0
          ? formatNetworkId(ni.location)
          : resolveLocationName(mapsByGame, finderGame ?? slotSession.game, ni.location);
      const fromLabel = playerAlias(players, ni.player);
      return { index, itemLabel, locLabel, fromLabel, dateLabel, timeLabel, raw: ni, finderGame };
    });
  }, [receivedItems, mapsByGame, players, slotGames, slotSession.game]);

  const qReceived = queryReceived.trim().toLowerCase();

  const filteredReceived = useMemo(() => {
    const rows = !qReceived
      ? receivedRows
      : receivedRows.filter(
          (r) =>
            r.itemLabel.toLowerCase().includes(qReceived) ||
            r.locLabel.toLowerCase().includes(qReceived) ||
            r.fromLabel.toLowerCase().includes(qReceived),
        );
    return [...rows].sort((a, b) => b.index - a.index);
  }, [receivedRows, qReceived]);

  const helperText =
    subTab === SUB_TAB_RECEIVED
      ? "Items sent to you from other players’ worlds (ReceivedItems). Newest first."
      : "Locations in your game — checked and remaining.";

  const runLocationScouts = (locationId: number, createAsHint: number) => {
    setScoutingLocationId(locationId);
    sendArchipelagoPacket(
      socket,
      buildLocationScoutsPacket({ locations: [locationId], createAsHint }),
    );
    window.setTimeout(() => {
      setScoutingLocationId((cur) => (cur === locationId ? null : cur));
    }, SCOUT_TIMEOUT_MS);
  };

  const onScout = (locationId: number) => {
    runLocationScouts(locationId, LOCATION_SCOUT_CREATE_AS_HINT.NONE);
  };

  const onShareScout = (locationId: number) => {
    runLocationScouts(locationId, LOCATION_SCOUT_CREATE_AS_HINT.BROADCAST_NEW);
  };

  if (!maps) {
    return (
      <Card variant="outlined">
        <CardHeader title="Checks" slotProps={{ title: { component: "h2" } }} />
        <CardContent>
          <Typography color="text.secondary">Loading data package…</Typography>
        </CardContent>
      </Card>
    );
  }

  const groupKeys = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <Card variant="outlined">
      <CardHeader title="Checks" slotProps={{ title: { component: "h2" } }} />
      <CardContent>
        <Stack spacing={2}>
          <Tabs
            value={subTab}
            onChange={(_, v) => setSubTab(v)}
            aria-label="Checks views"
          >
            <Tab label={`Received (${receivedItems.length})`} />
            <Tab label="Sent" />
          </Tabs>
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>

          {subTab === SUB_TAB_RECEIVED ? (
            <Stack spacing={2}>
              {receivedItemsSyncError ? (
                <Alert severity="warning" role="status">
                  {receivedItemsSyncError}
                </Alert>
              ) : null}
              <Typography variant="body2" color="text.secondary">
                {receivedItems.length} item{receivedItems.length === 1 ? "" : "s"} received
              </Typography>
              <TextField
                label="Filter"
                value={queryReceived}
                onChange={(e) => setQueryReceived(e.target.value)}
                fullWidth
                size="small"
                helperText="Filter by item, location, or finder"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Item names use your active slot&apos;s game: {slotSession.game}.
              </Typography>
              {filteredReceived.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {receivedItems.length === 0 ? "No items received yet." : "No rows match the filter."}
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" aria-label="Items received from other worlds with client first-seen date and time">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredReceived.map((r) => (
                        <TableRow key={`${r.index}-${r.raw.item}-${r.raw.location}-${r.raw.player}`}>
                          <TableCell>{r.index + 1}</TableCell>
                          <TableCell>{r.dateLabel}</TableCell>
                          <TableCell>{r.timeLabel}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{r.itemLabel}</Typography>
                          </TableCell>
                          <TableCell>{r.fromLabel}</TableCell>
                          <TableCell>
                            <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
                              <Typography variant="body2">{r.locLabel}</Typography>
                              {r.finderGame ? (
                                <GameNameCaption
                                  game={r.finderGame}
                                  registered={registeredGameSet.has(r.finderGame)}
                                  accentColor={
                                    connectionColorsByTeamSlot
                                      ? accentColorForNetworkSlot(
                                          players,
                                          r.raw.player,
                                          connectionColorsByTeamSlot,
                                        )
                                      : undefined
                                  }
                                />
                              ) : null}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          ) : (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "flex-end" } }}>
                <TextField
                  label="Filter by name"
                  value={querySent}
                  onChange={(e) => setQuerySent(e.target.value)}
                  fullWidth
                  size="small"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hideFinished}
                      onChange={(_, c) => setHideFinished(c)}
                      size="small"
                    />
                  }
                  label="Hide finished checks"
                />
              </Stack>
              {groupKeys.map((group) => (
                <Accordion key={group} defaultExpanded>
                  <AccordionSummary>
                    <Typography variant="subtitle1">
                      {group} ({grouped.get(group)?.length ?? 0})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense disablePadding>
                      {grouped.get(group)?.map((row) => {
                        const atHints = byLocHint.get(row.id) ?? [];
                        const scouted = scoutedLocations[row.id];
                        const isScouting = scoutingLocationId === row.id;
                        return (
                          <ListItem key={row.id} disableGutters sx={{ py: 1, alignItems: "flex-start" }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ width: "100%", alignItems: "flex-start" }}
                            >
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{ width: "1.25em", flexShrink: 0, lineHeight: 1.5, pt: 0.125 }}
                                aria-hidden
                              >
                                {row.checked ? "✓" : "○"}
                              </Typography>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                                  <Typography
                                    variant="body2"
                                    component="div"
                                    color={row.checked ? "text.primary" : "text.secondary"}
                                    sx={{ flex: "1 1 auto", minWidth: 0 }}
                                  >
                                    {row.name}
                                  </Typography>
                                  {!row.checked && atHints.length === 0 && !(scouted && scouted.length > 0) ? (
                                    <Button
                                      type="button"
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      disabled={isScouting || socket.readyState !== WebSocket.OPEN}
                                      onClick={() => onScout(row.id)}
                                      sx={{ flexShrink: 0 }}
                                    >
                                      {isScouting ? (
                                        <CircularProgress size={16} sx={{ mr: 0.5 }} aria-hidden />
                                      ) : null}
                                      Scout
                                    </Button>
                                  ) : null}
                                  {!row.checked &&
                                  atHints.length === 0 &&
                                  scouted &&
                                  scouted.length > 0 ? (
                                    <Button
                                      type="button"
                                      size="small"
                                      variant="outlined"
                                      color="success"
                                      disabled={isScouting || socket.readyState !== WebSocket.OPEN}
                                      onClick={() => onShareScout(row.id)}
                                      sx={{ flexShrink: 0 }}
                                    >
                                      {isScouting ? (
                                        <CircularProgress size={16} sx={{ mr: 0.5 }} aria-hidden />
                                      ) : null}
                                      Share
                                    </Button>
                                  ) : null}
                                </Stack>
                                {scouted && scouted.length > 0 && atHints.length === 0 ? (
                                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                    {scouted.map((ni, si) => (
                                      <SentCheckDetailLine
                                        key={`${row.id}-scout-${ni.item}-${si}`}
                                        prefix="Scout"
                                        itemText={
                                          ni.item <= 0
                                            ? formatNetworkId(ni.item)
                                            : resolveItemName(
                                                mapsByGame,
                                                ni.item,
                                                gameForHintItem(slotGames, ni.player) ?? slotSession.game,
                                              )
                                        }
                                        forPlayerName={playerAlias(players, ni.player)}
                                        flags={ni.flags}
                                        status={undefined}
                                        includeStatusChips={false}
                                      />
                                    ))}
                                  </Stack>
                                ) : null}
                                {atHints.length > 0 ? (
                                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                    {atHints.map((h, i) => (
                                      <SentCheckDetailLine
                                        key={`${row.id}-${h.item}-${h.location}-${i}`}
                                        prefix="Hint"
                                        itemText={resolveItemName(
                                          mapsByGame,
                                          h.item,
                                          gameForHintItem(slotGames, h.receiving_player) ?? slotSession.game,
                                        )}
                                        forPlayerName={playerAlias(players, h.receiving_player)}
                                        flags={h.item_flags}
                                        status={h.status}
                                        includeStatusChips
                                      />
                                    ))}
                                  </Stack>
                                ) : null}
                              </Box>
                            </Stack>
                          </ListItem>
                        );
                      })}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
