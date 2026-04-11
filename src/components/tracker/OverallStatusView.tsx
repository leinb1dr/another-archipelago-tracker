import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SlotSession } from "../../protocol/connectPackets";
import { completionRatio } from "../../tracker/locationState";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import { itemHasProgressionFlag, isPriorityHint } from "../../tracker/hintUtils";
import { resolveItemName, resolveLocationName } from "../../tracker/resolveNames";

export type OverallStatusViewProps = {
  slotSession: SlotSession;
  tracker: TrackerRuntimeState;
};

export function OverallStatusView({ slotSession, tracker }: OverallStatusViewProps) {
  const { location, mapsByGame, hints } = tracker;
  const maps = mapsByGame[slotSession.game];
  const pct = completionRatio(location);
  const pctLabel = pct === null ? "—" : `${Math.round(pct * 1000) / 10}%`;

  const priorityEntries = hints.filter(
    (h) => isPriorityHint(h) || itemHasProgressionFlag(h.item_flags),
  );

  return (
    <Card variant="outlined">
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
              Completion
            </Typography>
            <Typography variant="body1">{pctLabel}</Typography>
            <Typography variant="caption" color="text.secondary">
              {location.checkedLocationIds.length} checked · {location.missingLocationIds.length}{" "}
              remaining
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
              Priority hints / progression
            </Typography>
            {!maps ? (
              <Typography variant="body2" color="text.secondary">
                Loading data package…
              </Typography>
            ) : priorityEntries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No priority-tagged hints yet.
              </Typography>
            ) : (
              <List dense disablePadding>
                {priorityEntries.slice(0, 12).map((h, i) => (
                  <ListItem key={`${h.location}-${h.item}-${i}`} disableGutters sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={resolveItemName(mapsByGame, h.item)}
                      secondary={`${resolveLocationName(mapsByGame, slotSession.game, h.location)} · ${
                        h.found ? "Found" : "Not found"
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
