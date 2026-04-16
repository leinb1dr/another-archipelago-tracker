import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TableContainer from "@mui/material/TableContainer";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { accentColorForNetworkSlot } from "../../connection/slotConnectionColorsStorage";
import { sendArchipelagoPacket } from "../../connection/sendArchipelagoPacket";
import type { SlotSession } from "../../protocol/connectPackets";
import {
  buildGetPacket,
  buildUpdateHintPacket,
  HINT_STATUS,
  type HintPacket,
  readHintsStorageKey,
} from "../../protocol/serverPackets";
import type { TrackerRuntimeState } from "../../tracker/packetHandlers";
import {
  canChangeHintStatus,
  EDITABLE_HINT_STATUSES,
  hintStatusLabel,
  hintsForFindingPlayer,
  hintsForReceivingPlayer,
} from "../../tracker/hintUtils";
import { gameForHintItem, gameForHintLocation } from "../../tracker/slotGames";
import { playerAlias, resolveItemName, resolveLocationName } from "../../tracker/resolveNames";
import { GameNameCaption } from "./GameNameCaption";

export type HintsViewProps = {
  socket: WebSocket;
  slotSession: SlotSession;
  tracker: TrackerRuntimeState;
  registeredGames?: string[];
  connectionColorsByTeamSlot?: ReadonlyMap<string, string>;
};

function hintStatusRowKey(h: HintPacket): string {
  return `${h.finding_player}:${h.location}:${h.item}`;
}

function HintStatusField({
  h,
  tracker,
  socket,
  statusBusyKey,
  setStatusBusyKey,
  setUpdateHintError,
}: {
  h: HintPacket;
  tracker: TrackerRuntimeState;
  socket: WebSocket;
  statusBusyKey: string | null;
  setStatusBusyKey: (k: string | null) => void;
  setUpdateHintError: (s: string | null) => void;
}) {
  const slot = tracker.slot;
  const team = tracker.team;
  if (!canChangeHintStatus(h, slot)) {
    return (
      <Typography variant="body2" component="span">
        {hintStatusLabel(h.status)}
      </Typography>
    );
  }

  const normalized = h.status ?? HINT_STATUS.HINT_UNSPECIFIED;
  const selectValue = EDITABLE_HINT_STATUSES.includes(normalized)
    ? normalized
    : HINT_STATUS.HINT_UNSPECIFIED;
  const anyBusy = statusBusyKey !== null;

  const onChange = (next: number) => {
    setUpdateHintError(null);
    setStatusBusyKey(hintStatusRowKey(h));
    sendArchipelagoPacket(
      socket,
      buildUpdateHintPacket({ player: h.finding_player, location: h.location, status: next }),
    );
    sendArchipelagoPacket(socket, buildGetPacket([readHintsStorageKey(team, slot)]));
    window.setTimeout(() => setStatusBusyKey(null), 1200);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <Select
        value={selectValue}
        disabled={anyBusy}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Hint status for location ${h.location}`}
        renderValue={() => hintStatusLabel(h.status)}
      >
        {EDITABLE_HINT_STATUSES.map((s) => (
          <MenuItem key={s} value={s}>
            {hintStatusLabel(s)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

type FiltersSub = {
  item: string;
  location: string;
  player: string[];
  checked: string[];
  status: string[];
};

type FiltersAll = {
  item: string;
  location: string;
  receiver: string[];
  finder: string[];
  checked: string[];
  status: string[];
};

const emptyFiltersSub = (): FiltersSub => ({
  item: "",
  location: "",
  player: [],
  checked: [],
  status: [],
});

const emptyFiltersAll = (): FiltersAll => ({
  item: "",
  location: "",
  receiver: [],
  finder: [],
  checked: [],
  status: [],
});

function matchTextFilter(query: string, display: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return display.toLowerCase().includes(q);
}

function matchMultiSelect(selected: string[], display: string): boolean {
  if (selected.length === 0) return true;
  return selected.includes(display);
}

function hasActiveFiltersSub(tab: number, f: FiltersSub): boolean {
  if (f.item.trim() !== "") return true;
  if (tab === 1 && f.location.trim() !== "") return true;
  if (f.player.length > 0) return true;
  if (f.checked.length > 0) return true;
  if (f.status.length > 0) return true;
  return false;
}

function hasActiveFiltersAll(f: FiltersAll): boolean {
  return (
    f.item.trim() !== "" ||
    f.location.trim() !== "" ||
    f.receiver.length > 0 ||
    f.finder.length > 0 ||
    f.checked.length > 0 ||
    f.status.length > 0
  );
}

export function HintsView({
  socket,
  slotSession,
  tracker,
  registeredGames = [],
  connectionColorsByTeamSlot,
}: HintsViewProps) {
  const [tab, setTab] = useState(0);
  const [filtersSub, setFiltersSub] = useState<FiltersSub>(emptyFiltersSub);
  const [filtersAll, setFiltersAll] = useState<FiltersAll>(emptyFiltersAll);
  const [statusBusyKey, setStatusBusyKey] = useState<string | null>(null);
  const [updateHintError, setUpdateHintError] = useState<string | null>(null);
  const { hints, mapsByGame, slot, players, slotGames } = tracker;
  const registeredGameSet = new Set(registeredGames);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const raw = typeof ev.data === "string" ? ev.data : "";
      let data: unknown;
      try {
        data = JSON.parse(raw) as unknown;
      } catch {
        return;
      }
      if (!Array.isArray(data)) return;
      for (const p of data) {
        if (p === null || typeof p !== "object" || !("cmd" in p)) continue;
        if ((p as { cmd?: string }).cmd !== "InvalidPacket") continue;
        const ip = p as { original_cmd?: string; text?: string };
        if (ip.original_cmd === "UpdateHint" || String(ip.text ?? "").includes("UpdateHint")) {
          setUpdateHintError(ip.text ?? "Could not update hint status.");
          setStatusBusyKey(null);
        }
      }
    };
    socket.addEventListener("message", onMsg);
    return () => socket.removeEventListener("message", onMsg);
  }, [socket]);

  const receive = useMemo(
    () => hintsForReceivingPlayer(hints, slot).sort((a, b) => a.location - b.location),
    [hints, slot],
  );
  const send = useMemo(
    () => hintsForFindingPlayer(hints, slot).sort((a, b) => a.location - b.location),
    [hints, slot],
  );
  const allSorted = useMemo(
    () => [...hints].sort((a, b) => a.location - b.location || a.item - b.item),
    [hints],
  );

  const list = tab === 0 ? receive : tab === 1 ? send : allSorted;

  const itemGame = (h: HintPacket) =>
    gameForHintItem(slotGames, h.receiving_player) ?? slotSession.game;
  const locGame = (h: HintPacket) =>
    gameForHintLocation(slotGames, h.finding_player) ?? slotSession.game;

  const statusOptions = useMemo(() => {
    const labels = new Set<string>([
      "—",
      "Unspecified",
      "No priority",
      "Avoid",
      "Priority",
      "Found",
    ]);
    for (const h of hints) {
      labels.add(hintStatusLabel(h.status));
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [hints]);

  const receiverOptionsAll = useMemo(() => {
    const s = new Set<string>();
    for (const h of allSorted) {
      s.add(playerAlias(players, h.receiving_player));
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [allSorted, players]);

  const finderOptionsAll = useMemo(() => {
    const s = new Set<string>();
    for (const h of allSorted) {
      s.add(playerAlias(players, h.finding_player));
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [allSorted, players]);

  const playerOptionsSub = useMemo(() => {
    const s = new Set<string>();
    for (const h of list) {
      if (tab === 0) {
        s.add(playerAlias(players, h.finding_player));
      } else {
        s.add(playerAlias(players, h.receiving_player));
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [list, players, tab]);

  const filteredRows = useMemo(() => {
    if (tab === 2) {
      const f = filtersAll;
      return allSorted.filter((h) => {
        if (
          !matchTextFilter(
            f.item,
            resolveItemName(mapsByGame, h.item, itemGame(h)),
          )
        ) {
          return false;
        }
        if (
          !matchTextFilter(
            f.location,
            resolveLocationName(mapsByGame, locGame(h), h.location),
          )
        ) {
          return false;
        }
        if (!matchMultiSelect(f.receiver, playerAlias(players, h.receiving_player))) {
          return false;
        }
        if (!matchMultiSelect(f.finder, playerAlias(players, h.finding_player))) {
          return false;
        }
        if (!matchMultiSelect(f.checked, h.found ? "Found" : "Open")) {
          return false;
        }
        if (!matchMultiSelect(f.status, hintStatusLabel(h.status))) {
          return false;
        }
        return true;
      });
    }
    const f = filtersSub;
    return list.filter((h) => {
      if (!matchTextFilter(f.item, resolveItemName(mapsByGame, h.item, itemGame(h)))) {
        return false;
      }
      if (tab === 1) {
        if (
          !matchTextFilter(
            f.location,
            resolveLocationName(mapsByGame, locGame(h), h.location),
          )
        ) {
          return false;
        }
      }
      const playerStr =
        tab === 0 ? playerAlias(players, h.finding_player) : playerAlias(players, h.receiving_player);
      if (!matchMultiSelect(f.player, playerStr)) {
        return false;
      }
      if (!matchMultiSelect(f.checked, h.found ? "Found" : "Open")) {
        return false;
      }
      if (!matchMultiSelect(f.status, hintStatusLabel(h.status))) {
        return false;
      }
      return true;
    });
  }, [
    tab,
    list,
    allSorted,
    filtersSub,
    filtersAll,
    mapsByGame,
    slotGames,
    slotSession.game,
    players,
  ]);

  const hasActiveSubFilters = hasActiveFiltersSub(tab, filtersSub);
  const hasActiveAllFilters = hasActiveFiltersAll(filtersAll);

  const helperText =
    tab === 0
      ? "Items and locations relevant to you as the recipient (receiving_player is your slot)."
      : tab === 1
        ? "Items placed in your world for others (finding_player is your slot)."
        : "Every hint returned by the server for your slot (_read_hints). Same row may appear in For you and In your world when both players are you.";

  const thirdColumnLabel = tab === 0 ? "Found in" : "Goes to";

  const selectSx = { minWidth: 120, maxWidth: 180, flex: "1 1 120px" };
  const filterRowSx = {
    alignItems: "flex-end",
    flexWrap: "nowrap",
    overflowX: "auto",
    pb: 0.5,
  };
  const textFilterSx = { minWidth: 90, flex: "1 1 110px" };

  return (
    <Card variant="outlined">
      <CardHeader title="Hints" slotProps={{ title: { component: "h2" } }} />
      <CardContent>
        <Stack spacing={2}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={`For you (${receive.length})`} />
            <Tab label={`In your world (${send.length})`} />
            <Tab label={`All (${hints.length})`} />
          </Tabs>
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>
          {updateHintError ? (
            <Alert severity="error" onClose={() => setUpdateHintError(null)} role="alert">
              {updateHintError}
            </Alert>
          ) : null}
          {list.length === 0 ? (
            <Typography color="text.secondary">No hints in this list.</Typography>
          ) : (
            <>
              {tab === 2 ? (
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={filterRowSx}
                  >
                    <TextField
                      label="Item"
                      size="small"
                      value={filtersAll.item}
                      onChange={(e) => setFiltersAll((p) => ({ ...p, item: e.target.value }))}
                      sx={textFilterSx}
                    />
                    <TextField
                      label="Location"
                      size="small"
                      value={filtersAll.location}
                      onChange={(e) => setFiltersAll((p) => ({ ...p, location: e.target.value }))}
                      sx={textFilterSx}
                    />
                    <FormControl size="small" sx={selectSx}>
                      <InputLabel id="hints-filter-receiver">Receiver</InputLabel>
                      <Select
                        labelId="hints-filter-receiver"
                        multiple
                        value={filtersAll.receiver}
                        onChange={(e) =>
                          setFiltersAll((p) => ({
                            ...p,
                            receiver: typeof e.target.value === "string" ? [] : [...e.target.value],
                          }))
                        }
                        input={<OutlinedInput label="Receiver" />}
                        renderValue={(selected) => (selected as string[]).join(", ")}
                      >
                        {receiverOptionsAll.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={selectSx}>
                      <InputLabel id="hints-filter-finder">Finder</InputLabel>
                      <Select
                        labelId="hints-filter-finder"
                        multiple
                        value={filtersAll.finder}
                        onChange={(e) =>
                          setFiltersAll((p) => ({
                            ...p,
                            finder: typeof e.target.value === "string" ? [] : [...e.target.value],
                          }))
                        }
                        input={<OutlinedInput label="Finder" />}
                        renderValue={(selected) => (selected as string[]).join(", ")}
                      >
                        {finderOptionsAll.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={selectSx}>
                      <InputLabel id="hints-filter-checked-all">Checked</InputLabel>
                      <Select
                        labelId="hints-filter-checked-all"
                        multiple
                        value={filtersAll.checked}
                        onChange={(e) =>
                          setFiltersAll((p) => ({
                            ...p,
                            checked: typeof e.target.value === "string" ? [] : [...e.target.value],
                          }))
                        }
                        input={<OutlinedInput label="Checked" />}
                        renderValue={(selected) => (selected as string[]).join(", ")}
                      >
                        <MenuItem value="Found">Found</MenuItem>
                        <MenuItem value="Open">Open</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={selectSx}>
                      <InputLabel id="hints-filter-status-all">Hint status</InputLabel>
                      <Select
                        labelId="hints-filter-status-all"
                        multiple
                        value={filtersAll.status}
                        onChange={(e) =>
                          setFiltersAll((p) => ({
                            ...p,
                            status: typeof e.target.value === "string" ? [] : [...e.target.value],
                          }))
                        }
                        input={<OutlinedInput label="Hint status" />}
                        renderValue={(selected) => (selected as string[]).join(", ")}
                      >
                        {statusOptions.map((label) => (
                          <MenuItem key={label} value={label}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {hasActiveAllFilters ? (
                      <Button size="small" onClick={() => setFiltersAll(emptyFiltersAll())}>
                        Clear filters
                      </Button>
                    ) : null}
                  </Stack>
                  {hasActiveAllFilters ? (
                    <Typography variant="caption" color="text.secondary">
                      Showing {filteredRows.length} of {list.length}
                    </Typography>
                  ) : null}
                </Stack>
              ) : (
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={filterRowSx}
                  >
                    <TextField
                      label="Item"
                      size="small"
                      value={filtersSub.item}
                      onChange={(e) => setFiltersSub((p) => ({ ...p, item: e.target.value }))}
                      sx={textFilterSx}
                    />
                    {tab === 1 ? (
                      <TextField
                        label="Location"
                        size="small"
                        value={filtersSub.location}
                        onChange={(e) => setFiltersSub((p) => ({ ...p, location: e.target.value }))}
                        sx={textFilterSx}
                      />
                    ) : null}
                    <FormControl size="small" sx={selectSx}>
                      <InputLabel id="hints-filter-player-sub">{thirdColumnLabel}</InputLabel>
                      <Select
                        labelId="hints-filter-player-sub"
                        multiple
                        value={filtersSub.player}
                        onChange={(e) =>
                          setFiltersSub((p) => ({
                            ...p,
                            player: typeof e.target.value === "string" ? [] : [...e.target.value],
                          }))
                        }
                        input={<OutlinedInput label={thirdColumnLabel} />}
                        renderValue={(selected) => (selected as string[]).join(", ")}
                      >
                        {playerOptionsSub.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={selectSx}>
                      <InputLabel id="hints-filter-checked-sub">Checked</InputLabel>
                      <Select
                        labelId="hints-filter-checked-sub"
                        multiple
                        value={filtersSub.checked}
                        onChange={(e) =>
                          setFiltersSub((p) => ({
                            ...p,
                            checked: typeof e.target.value === "string" ? [] : [...e.target.value],
                          }))
                        }
                        input={<OutlinedInput label="Checked" />}
                        renderValue={(selected) => (selected as string[]).join(", ")}
                      >
                        <MenuItem value="Found">Found</MenuItem>
                        <MenuItem value="Open">Open</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={selectSx}>
                      <InputLabel id="hints-filter-status-sub">Hint status</InputLabel>
                      <Select
                        labelId="hints-filter-status-sub"
                        multiple
                        value={filtersSub.status}
                        onChange={(e) =>
                          setFiltersSub((p) => ({
                            ...p,
                            status: typeof e.target.value === "string" ? [] : [...e.target.value],
                          }))
                        }
                        input={<OutlinedInput label="Hint status" />}
                        renderValue={(selected) => (selected as string[]).join(", ")}
                      >
                        {statusOptions.map((label) => (
                          <MenuItem key={label} value={label}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {hasActiveSubFilters ? (
                      <Button size="small" onClick={() => setFiltersSub(emptyFiltersSub())}>
                        Clear filters
                      </Button>
                    ) : null}
                  </Stack>
                  {hasActiveSubFilters ? (
                    <Typography variant="caption" color="text.secondary">
                      Showing {filteredRows.length} of {list.length}
                    </Typography>
                  ) : null}
                </Stack>
              )}
              {filteredRows.length === 0 ? (
                <Typography color="text.secondary">No hints match the current filters.</Typography>
              ) : tab === 2 ? (
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 980 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Receiver</TableCell>
                        <TableCell>Finder</TableCell>
                        <TableCell align="center">Checked</TableCell>
                        <TableCell>Hint status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRows.map((h, i) => {
                        const itemGame = gameForHintItem(slotGames, h.receiving_player) ?? slotSession.game;
                        const locGame = gameForHintLocation(slotGames, h.finding_player) ?? slotSession.game;
                        return (
                          <TableRow key={`all-${h.location}-${h.item}-${i}`}>
                            <TableCell>
                              <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
                                <Typography variant="body2">
                                  {resolveItemName(mapsByGame, h.item, itemGame)}
                                </Typography>
                                <GameNameCaption
                                  game={itemGame}
                                  registered={registeredGameSet.has(itemGame)}
                                  accentColor={
                                    connectionColorsByTeamSlot
                                      ? accentColorForNetworkSlot(
                                          players,
                                          h.receiving_player,
                                          connectionColorsByTeamSlot,
                                        )
                                      : undefined
                                  }
                                />
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
                                <Typography variant="body2">
                                  {resolveLocationName(mapsByGame, locGame, h.location)}
                                </Typography>
                                <GameNameCaption
                                  game={locGame}
                                  registered={registeredGameSet.has(locGame)}
                                  accentColor={
                                    connectionColorsByTeamSlot
                                      ? accentColorForNetworkSlot(
                                          players,
                                          h.finding_player,
                                          connectionColorsByTeamSlot,
                                        )
                                      : undefined
                                  }
                                />
                              </Stack>
                            </TableCell>
                            <TableCell>{playerAlias(players, h.receiving_player)}</TableCell>
                            <TableCell>{playerAlias(players, h.finding_player)}</TableCell>
                            <TableCell align="center">
                              {h.found ? (
                                <Chip size="small" label="Found" color="success" variant="outlined" />
                              ) : (
                                <Chip size="small" label="Open" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              <HintStatusField
                                h={h}
                                tracker={tracker}
                                socket={socket}
                                statusBusyKey={statusBusyKey}
                                setStatusBusyKey={setStatusBusyKey}
                                setUpdateHintError={setUpdateHintError}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 820 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>{tab === 0 ? "Found in" : "Goes to"}</TableCell>
                        <TableCell align="right">Checked</TableCell>
                        <TableCell>Hint status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRows.map((h, i) => {
                        const itemGame = gameForHintItem(slotGames, h.receiving_player) ?? slotSession.game;
                        const locGame = gameForHintLocation(slotGames, h.finding_player) ?? slotSession.game;
                        return (
                          <TableRow key={`${h.location}-${h.item}-${i}`}>
                            <TableCell>
                              <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
                                <Typography variant="body2">
                                  {resolveItemName(mapsByGame, h.item, itemGame)}
                                </Typography>
                                <GameNameCaption
                                  game={itemGame}
                                  registered={registeredGameSet.has(itemGame)}
                                  accentColor={
                                    connectionColorsByTeamSlot
                                      ? accentColorForNetworkSlot(
                                          players,
                                          h.receiving_player,
                                          connectionColorsByTeamSlot,
                                        )
                                      : undefined
                                  }
                                />
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
                                <Typography variant="body2">
                                  {resolveLocationName(mapsByGame, locGame, h.location)}
                                </Typography>
                                <GameNameCaption
                                  game={locGame}
                                  registered={registeredGameSet.has(locGame)}
                                  accentColor={
                                    connectionColorsByTeamSlot
                                      ? accentColorForNetworkSlot(
                                          players,
                                          h.finding_player,
                                          connectionColorsByTeamSlot,
                                        )
                                      : undefined
                                  }
                                />
                              </Stack>
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
                            <TableCell>
                              <HintStatusField
                                h={h}
                                tracker={tracker}
                                socket={socket}
                                statusBusyKey={statusBusyKey}
                                setStatusBusyKey={setStatusBusyKey}
                                setUpdateHintError={setUpdateHintError}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
