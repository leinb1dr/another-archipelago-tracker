import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import type { SlotSession } from "../../protocol/connectPackets";
import type { HintPacket } from "../../protocol/serverPackets";
import { buildCheckRows, groupRowsByLabel } from "../../tracker/checksGrouping";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import { resolveItemName } from "../../tracker/resolveNames";

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
  const { location, mapsByGame, locationGroups, hints } = tracker;
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
                    <ListItem key={row.id} disableGutters sx={{ py: 0.5, alignItems: "flex-start" }}>
                      <ListItemText
                        primary={
                          <Typography component="span" variant="body2">
                            {row.checked ? "✓ " : "○ "}
                            {row.name}
                          </Typography>
                        }
                        secondary={
                          atHints.length ? (
                            <Typography component="span" variant="caption" color="text.secondary">
                              Hinted:{" "}
                              {atHints.map((h, i) => (
                                <span key={`${h.item}-${i}`}>
                                  {resolveItemName(mapsByGame, h.item)}
                                  {i < atHints.length - 1 ? " · " : ""}
                                </span>
                              ))}
                            </Typography>
                          ) : null
                        }
                      />
                      {atHints.length ? (
                        <Chip size="small" label="Hint" variant="outlined" sx={{ ml: 1 }} />
                      ) : null}
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
