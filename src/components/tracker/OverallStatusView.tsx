import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import type { SlotSession } from "../../protocol/connectPackets";
import type { RoomInfo } from "../../protocol/roomInfo";
import type { HintPacket } from "../../protocol/serverPackets";
import { completionRatio } from "../../tracker/locationState";
import type { ReceivedItemRecord, TrackerRuntimeState } from "../../tracker/packetHandlers";
import {
  hintStableKey,
  isOpenPriorityOrProgressionHintForOthers,
  isPriorityHint,
  itemHasProgressionFlag,
} from "../../tracker/hintUtils";
import {
  loadLastSessionEndAt,
  receivedItemsLastSessionEndStorageKey,
} from "../../tracker/receivedItemsFirstSeenStorage";
import { playerAlias, resolveItemName, resolveLocationName } from "../../tracker/resolveNames";
import { gameForHintItem, gameForHintLocation } from "../../tracker/slotGames";

export type OverallStatusViewProps = {
  room: RoomInfo;
  slotSession: SlotSession;
  tracker: TrackerRuntimeState;
};

function sortHintsByLocationItem(a: HintPacket, b: HintPacket): number {
  return a.location - b.location || a.item - b.item;
}

function formatNetworkId(id: number): string {
  if (id <= 0) return `(special #${id})`;
  return `#${id}`;
}

export function OverallStatusView({ room, slotSession, tracker }: OverallStatusViewProps) {
  const { location, mapsByGame, hints, slotGames, players, receivedItems } = tracker;
  const maps = mapsByGame[slotSession.game];
  const pct = completionRatio(location);
  const pctLabel = pct === null ? "—" : `${Math.round(pct * 1000) / 10}%`;
  const progressValue = pct === null ? 0 : pct * 100;
  const checkedCount = location.checkedLocationIds.length;
  const remainingCount = location.missingLocationIds.length;

  const mySlot = tracker.slot;

  const priorityEntries = useMemo(
    () => hints.filter((h) => isOpenPriorityOrProgressionHintForOthers(h, mySlot)).sort(sortHintsByLocationItem),
    [hints, mySlot],
  );

  const { hasReceivedItemsBaseline, newReceivedItemsSinceLastVisit } = useMemo(() => {
    const raw = loadLastSessionEndAt(
      receivedItemsLastSessionEndStorageKey(
        room.seed_name,
        slotSession.connected.team,
        slotSession.connected.slot,
      ),
    );
    if (raw === null) {
      return { hasReceivedItemsBaseline: false, newReceivedItemsSinceLastVisit: [] as ReceivedItemRecord[] };
    }
    const next = receivedItems.filter((r) => r.firstSeenAt > raw);
    return { hasReceivedItemsBaseline: true, newReceivedItemsSinceLastVisit: next };
  }, [
    receivedItems,
    room.seed_name,
    slotSession.connected.team,
    slotSession.connected.slot,
  ]);

  const renderHintList = (entries: HintPacket[], showKindChips: boolean) => {
    if (!maps) {
      return (
        <Typography variant="body2" color="text.secondary">
          Loading data package…
        </Typography>
      );
    }
    if (entries.length === 0) {
      return null;
    }
    return (
      <List dense disablePadding>
        {entries.slice(0, 12).map((h) => (
          <ListItem key={hintStableKey(h)} disableGutters sx={{ py: 0.25 }}>
            <ListItemText
              primary={
                showKindChips ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                    <Typography component="span" variant="body2">
                      {resolveItemName(
                        mapsByGame,
                        h.item,
                        gameForHintItem(slotGames, h.receiving_player) ?? slotSession.game,
                      )}
                    </Typography>
                    {isPriorityHint(h) ? (
                      <Chip label="Priority" size="small" variant="outlined" color="success" />
                    ) : null}
                    {itemHasProgressionFlag(h.item_flags) ? (
                      <Chip
                        label="Progression"
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: "#7b1fa2",
                          color: "#7b1fa2",
                        }}
                      />
                    ) : null}
                  </Box>
                ) : (
                  resolveItemName(
                    mapsByGame,
                    h.item,
                    gameForHintItem(slotGames, h.receiving_player) ?? slotSession.game,
                  )
                )
              }
              secondary={resolveLocationName(
                mapsByGame,
                gameForHintLocation(slotGames, h.finding_player) ?? slotSession.game,
                h.location,
              )}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderNewReceivedList = () => {
    if (!maps) {
      return (
        <Typography variant="body2" color="text.secondary">
          Loading data package…
        </Typography>
      );
    }
    const rows = newReceivedItemsSinceLastVisit;
    if (rows.length === 0) {
      return null;
    }
    return (
      <List dense disablePadding>
        {rows.slice(0, 12).map((rec, i) => {
          const ni = rec.item;
          const finderGame = gameForHintLocation(slotGames, ni.player) ?? slotSession.game;
          const itemLabel =
            ni.item <= 0
              ? formatNetworkId(ni.item)
              : resolveItemName(mapsByGame, ni.item, slotSession.game);
          const locLabel =
            ni.location <= 0
              ? formatNetworkId(ni.location)
              : resolveLocationName(mapsByGame, finderGame, ni.location);
          const fromLabel = playerAlias(players, ni.player);
          return (
            <ListItem key={`${ni.item}-${ni.location}-${ni.player}-${i}`} disableGutters sx={{ py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography component="span" variant="body2">
                    {itemLabel}
                  </Typography>
                }
                secondary={`${locLabel} · From ${fromLabel}`}
              />
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
    <Card component="section" aria-label="Overall status" variant="outlined">
      <CardHeader title="Overall status" slotProps={{ title: { component: "h2" } }} />
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Game
            </Typography>
            <Typography variant="body1">{slotSession.game}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Completed checks
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              aria-label="Completed checks progress"
              aria-valuetext={
                pct === null
                  ? "No checks available"
                  : `${checkedCount} of ${checkedCount + remainingCount} checks completed`
              }
              sx={{ height: 8, borderRadius: 999 }}
            />
            <Typography variant="caption" color="text.secondary">
              {pctLabel} · {checkedCount} checked · {remainingCount} remaining
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Hint points
            </Typography>
            <Typography variant="body1">
              {location.hintPoints === null ? "—" : String(location.hintPoints)}
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Open priority / progression
            </Typography>
            <Typography variant="caption" color="text.secondary">
              In your world for other players — unfound checks where the hint is priority and/or the item is
              progression.
            </Typography>
            {!maps ? (
              <Typography variant="body2" color="text.secondary">
                Loading data package…
              </Typography>
            ) : priorityEntries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                None right now.
              </Typography>
            ) : (
              renderHintList(priorityEntries, true)
            )}
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              New items since last visit
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Items sent to you (ReceivedItems) that arrived after your previous session ended.
            </Typography>
            {!hasReceivedItemsBaseline ? (
              <Typography variant="body2" color="text.secondary">
                New items will be listed here after you disconnect and sign in again.
              </Typography>
            ) : !maps ? (
              <Typography variant="body2" color="text.secondary">
                Loading data package…
              </Typography>
            ) : newReceivedItemsSinceLastVisit.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No new items since your last visit.
              </Typography>
            ) : (
              renderNewReceivedList()
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
