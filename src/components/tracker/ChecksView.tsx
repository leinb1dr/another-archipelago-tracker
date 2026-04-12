import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
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
import { useMemo, useState } from "react";
import type { SlotSession } from "../../protocol/connectPackets";
import { HINT_STATUS, type HintPacket } from "../../protocol/serverPackets";
import { buildCheckRows, groupRowsByLabel } from "../../tracker/checksGrouping";
import { hintStatusLabel } from "../../tracker/hintUtils";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import { playerAlias, resolveItemName, resolveLocationName } from "../../tracker/resolveNames";
import { gameForHintItem, gameForHintLocation } from "../../tracker/slotGames";

export type ChecksViewProps = {
  slotSession: SlotSession;
  tracker: TrackerRuntimeState;
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

export function ChecksView({ slotSession, tracker }: ChecksViewProps) {
  const {
    location,
    mapsByGame,
    locationGroups,
    hints,
    players,
    slotGames,
    receivedItems,
    receivedItemsSyncError,
  } = tracker;
  const maps = mapsByGame[slotSession.game];
  const [subTab, setSubTab] = useState(SUB_TAB_SENT);
  const [querySent, setQuerySent] = useState("");
  const [queryReceived, setQueryReceived] = useState("");

  const rows = useMemo(() => {
    if (!maps) return [];
    return buildCheckRows({
      checkedIds: location.checkedLocationIds,
      missingIds: location.missingLocationIds,
      maps,
      locationGroups,
    });
  }, [location, maps, locationGroups]);

  const byLocHint = useMemo(
    () => hintsByLocationForFinder(hints, tracker.slot),
    [hints, tracker.slot],
  );

  const filteredRows = useMemo(() => {
    const q = querySent.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, querySent]);

  const grouped = useMemo(() => groupRowsByLabel(filteredRows), [filteredRows]);

  const receivedRows = useMemo(() => {
    return receivedItems.map((ni, index) => {
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
      return { index, itemLabel, locLabel, fromLabel, raw: ni };
    });
  }, [receivedItems, mapsByGame, players, slotGames, slotSession.game]);

  const qReceived = queryReceived.trim().toLowerCase();

  const filteredReceived = useMemo(() => {
    if (!qReceived) return receivedRows;
    return receivedRows.filter(
      (r) =>
        r.itemLabel.toLowerCase().includes(qReceived) ||
        r.locLabel.toLowerCase().includes(qReceived) ||
        r.fromLabel.toLowerCase().includes(qReceived),
    );
  }, [receivedRows, qReceived]);

  const helperText =
    subTab === SUB_TAB_RECEIVED
      ? "Items sent to you from other players’ worlds (ReceivedItems)."
      : "Locations in your game — checked and remaining.";

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
              {filteredReceived.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {receivedItems.length === 0 ? "No items received yet." : "No rows match the filter."}
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" aria-label="Items received from other worlds">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredReceived.map((r) => (
                        <TableRow key={`${r.index}-${r.raw.item}-${r.raw.location}-${r.raw.player}`}>
                          <TableCell>{r.index + 1}</TableCell>
                          <TableCell>{r.itemLabel}</TableCell>
                          <TableCell>{r.fromLabel}</TableCell>
                          <TableCell>{r.locLabel}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          ) : (
            <>
              <TextField
                label="Filter by name"
                value={querySent}
                onChange={(e) => setQuerySent(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
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
                                <Typography
                                  variant="body2"
                                  component="div"
                                  color={row.checked ? "text.primary" : "text.secondary"}
                                >
                                  {row.name}
                                </Typography>
                                {atHints.length > 0 ? (
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ mt: 0.5, alignItems: "flex-start" }}
                                  >
                                    <Box
                                      sx={(theme) => ({
                                        flex: 1,
                                        minWidth: 0,
                                        pl: 1,
                                        borderLeft: `2px solid ${theme.palette.divider}`,
                                      })}
                                    >
                                      {atHints.map((h, i) => (
                                        <Typography
                                          key={`${row.id}-${h.item}-${h.location}-${i}`}
                                          variant="caption"
                                          component="div"
                                          color="text.secondary"
                                          sx={{ display: "block", lineHeight: 1.5 }}
                                        >
                                          Hinted:{" "}
                                          {resolveItemName(
                                            mapsByGame,
                                            h.item,
                                            gameForHintItem(slotGames, h.receiving_player) ??
                                              slotSession.game,
                                          )}{" "}
                                          · For{" "}
                                          {playerAlias(players, h.receiving_player)}
                                        </Typography>
                                      ))}
                                    </Box>
                                    <Stack spacing={0.5} sx={{ flexShrink: 0, pt: 0.125 }}>
                                      {atHints.map((h, i) => (
                                        <Chip
                                          key={`chip-${row.id}-${h.item}-${i}`}
                                          size="small"
                                          label={hintStatusLabel(h.status)}
                                          variant="outlined"
                                          color={
                                            h.status === HINT_STATUS.HINT_PRIORITY ? "warning" : "default"
                                          }
                                        />
                                      ))}
                                    </Stack>
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
