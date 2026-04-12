import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import type { SlotSession } from "../../protocol/connectPackets";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import { playerAlias, resolveItemName, resolveLocationName } from "../../tracker/resolveNames";
import { gameForHintLocation } from "../../tracker/slotGames";

export type ReceivedChecksViewProps = {
  slotSession: SlotSession;
  tracker: TrackerRuntimeState;
};

function formatNetworkId(id: number): string {
  if (id <= 0) return `(special #${id})`;
  return `#${id}`;
}

export function ReceivedChecksView({ slotSession, tracker }: ReceivedChecksViewProps) {
  const {
    mapsByGame,
    location,
    receivedItems,
    receivedItemsSyncError,
    players,
    slotGames,
  } = tracker;
  const maps = mapsByGame[slotSession.game];
  const [query, setQuery] = useState("");

  const yourChecks = useMemo(() => {
    if (!maps) return [];
    const ids = [...location.checkedLocationIds].sort((a, b) => a - b);
    return ids.map((id) => ({
      id,
      name: resolveLocationName(mapsByGame, slotSession.game, id),
    }));
  }, [location.checkedLocationIds, maps, mapsByGame, slotSession.game]);

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
          : resolveLocationName(mapsByGame, finderGame ?? null, ni.location);
      const fromLabel = playerAlias(players, ni.player);
      return { index, itemLabel, locLabel, fromLabel, raw: ni };
    });
  }, [receivedItems, mapsByGame, players, slotGames, slotSession.game]);

  const q = query.trim().toLowerCase();

  const filteredReceived = useMemo(() => {
    if (!q) return receivedRows;
    return receivedRows.filter(
      (r) =>
        r.itemLabel.toLowerCase().includes(q) ||
        r.locLabel.toLowerCase().includes(q) ||
        r.fromLabel.toLowerCase().includes(q),
    );
  }, [receivedRows, q]);

  const filteredYourChecks = useMemo(() => {
    if (!q) return yourChecks;
    return yourChecks.filter((r) => r.name.toLowerCase().includes(q));
  }, [yourChecks, q]);

  if (!maps) {
    return (
      <Card variant="outlined">
        <CardHeader title="Received checks" slotProps={{ title: { component: "h2" } }} />
        <CardContent>
          <Typography color="text.secondary">Loading data package…</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Received checks" slotProps={{ title: { component: "h2" } }} />
      <CardContent>
        <Stack spacing={2}>
          {receivedItemsSyncError ? (
            <Alert severity="warning" role="status">
              {receivedItemsSyncError}
            </Alert>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {receivedItems.length} item{receivedItems.length === 1 ? "" : "s"} received ·{" "}
            {yourChecks.length} location{yourChecks.length === 1 ? "" : "s"} checked in your game
          </Typography>
          <TextField
            label="Filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
            size="small"
            helperText="Filters both sections"
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardHeader title="Received items" slotProps={{ title: { component: "h3" } }} />
                <CardContent sx={{ pt: 0 }}>
                  {filteredReceived.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {receivedItems.length === 0
                        ? "No items received yet."
                        : "No rows match the filter."}
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
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardHeader title="Your checks" slotProps={{ title: { component: "h3" } }} />
                <CardContent sx={{ pt: 0 }}>
                  {filteredYourChecks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {yourChecks.length === 0
                        ? "No locations checked yet."
                        : "No rows match the filter."}
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {filteredYourChecks.map((row) => (
                        <ListItem key={row.id} disableGutters sx={{ py: 0.5 }}>
                          <Typography variant="body2" component="span" sx={{ mr: 1 }} aria-hidden>
                            ✓
                          </Typography>
                          <Typography variant="body2">{row.name}</Typography>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
