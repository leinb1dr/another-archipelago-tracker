import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import type { SlotSession } from "../../protocol/connectPackets";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import { hintsForFindingPlayer, hintsForReceivingPlayer } from "../../tracker/hintUtils";
import { playerAlias, resolveItemName, resolveLocationName } from "../../tracker/resolveNames";

export type HintsViewProps = {
  slotSession: SlotSession;
  tracker: TrackerRuntimeState;
};

export function HintsView({ slotSession, tracker }: HintsViewProps) {
  const [tab, setTab] = useState(0);
  const { hints, mapsByGame, slot, players } = tracker;

  const receive = useMemo(
    () => hintsForReceivingPlayer(hints, slot).sort((a, b) => a.location - b.location),
    [hints, slot],
  );
  const send = useMemo(
    () => hintsForFindingPlayer(hints, slot).sort((a, b) => a.location - b.location),
    [hints, slot],
  );

  const list = tab === 0 ? receive : send;

  return (
    <Card variant="outlined">
      <CardHeader title="Hints" slotProps={{ title: { component: "h2" } }} />
      <CardContent>
        <Stack spacing={2}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={`For you (${receive.length})`} />
            <Tab label={`In your world (${send.length})`} />
          </Tabs>
          <Typography variant="body2" color="text.secondary">
            {tab === 0
              ? "Items and locations relevant to you as the recipient (receiving_player is your slot)."
              : "Items placed in your world for others (finding_player is your slot)."}
          </Typography>
          {list.length === 0 ? (
            <Typography color="text.secondary">No hints in this list.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>{tab === 0 ? "Found in" : "Goes to"}</TableCell>
                  <TableCell align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((h, i) => (
                  <TableRow key={`${h.location}-${h.item}-${i}`}>
                    <TableCell>{resolveItemName(mapsByGame, h.item)}</TableCell>
                    <TableCell>
                      {resolveLocationName(mapsByGame, slotSession.game, h.location)}
                    </TableCell>
                    <TableCell>
                      {tab === 0
                        ? playerAlias(players, h.finding_player)
                        : playerAlias(players, h.receiving_player)}
                    </TableCell>
                    <TableCell align="right">
                      {h.found ? (
                        <Chip size="small" label="Found" color="success" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Open" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
