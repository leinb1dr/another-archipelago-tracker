import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import type { SlotSession } from "../../protocol/connectPackets";
import { HINT_STATUS, type HintPacket } from "../../protocol/serverPackets";
import { buildCheckRows, groupRowsByLabel } from "../../tracker/checksGrouping";
import { hintStatusLabel } from "../../tracker/hintUtils";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import { playerAlias, resolveItemName } from "../../tracker/resolveNames";
import { gameForHintItem } from "../../tracker/slotGames";

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

export function ChecksView({ slotSession, tracker }: ChecksViewProps) {
  const { location, mapsByGame, locationGroups, hints, players, slotGames } = tracker;
  const maps = mapsByGame[slotSession.game];
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const grouped = useMemo(() => groupRowsByLabel(filtered), [filtered]);

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
        <TextField
          label="Filter by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
                                      gameForHintItem(slotGames, h.receiving_player) ?? slotSession.game,
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
      </CardContent>
    </Card>
  );
}
