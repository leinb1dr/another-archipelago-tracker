import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { parseInboundFrame } from "../connection/messageLogFormat";
import type { InboundLogEntry } from "../connection/useInboundMessageLog";

function ChevronLeftSvg() {
  return (
    <Box component="svg" sx={{ width: 20, height: 20, display: "block" }} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </Box>
  );
}

function ChevronRightSvg() {
  return (
    <Box component="svg" sx={{ width: 20, height: 20, display: "block" }} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </Box>
  );
}

export type MessageLogPanelProps = {
  entries: InboundLogEntry[];
  onClear: () => void;
};

function FrameBlock({ entry }: { entry: InboundLogEntry }) {
  const parsed = parseInboundFrame(entry.raw);
  const timeLabel = new Date(entry.receivedAt).toLocaleString();

  if (parsed.kind === "text") {
    return (
      <Box sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
          {timeLabel}
        </Typography>
        <Typography
          variant="body2"
          component="pre"
          sx={{
            m: 0,
            fontFamily: "monospace",
            fontSize: "0.7rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {parsed.content}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
        {timeLabel}
      </Typography>
      <TableContainer sx={{ maxHeight: 280 }}>
        <Table size="small" aria-label="Protocol packets in this message">
          <TableHead>
            <TableRow>
              <TableCell width={40} sx={{ fontWeight: 600 }}>
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Command</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Payload</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parsed.rows.map((row) => (
              <TableRow key={`${entry.id}-${row.index}`}>
                <TableCell sx={{ verticalAlign: "top", fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {row.index}
                </TableCell>
                <TableCell sx={{ verticalAlign: "top", fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {row.cmd}
                </TableCell>
                <TableCell sx={{ verticalAlign: "top", p: 1 }}>
                  <Typography
                    component="pre"
                    sx={{
                      m: 0,
                      fontFamily: "monospace",
                      fontSize: "0.65rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 160,
                      overflow: "auto",
                    }}
                  >
                    {row.json}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export function MessageLogPanel({ entries, onClear }: MessageLogPanelProps) {
  const [panelExpanded, setPanelExpanded] = useState(false);
  const newestFirst = useMemo(() => [...entries].reverse(), [entries]);

  return (
    <Paper
      variant="outlined"
      role="region"
      aria-label="Message log"
      aria-expanded={panelExpanded}
      sx={{
        width: panelExpanded ? { xs: 280, sm: 400 } : 44,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignSelf: "stretch",
        minHeight: { xs: 200, md: 0 },
        maxHeight: { xs: 240, md: "none" },
        borderRadius: 0,
        borderTop: 0,
        borderBottom: 0,
        borderLeft: 0,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 0.5,
          px: panelExpanded ? 1 : 0,
          py: 1,
          borderBottom: panelExpanded ? 1 : 0,
          borderColor: "divider",
          minHeight: 48,
        }}
      >
        <Tooltip title={panelExpanded ? "Collapse message log" : "Expand message log"}>
          <IconButton
            size="small"
            aria-expanded={panelExpanded}
            aria-controls="message-log-content"
            onClick={() => setPanelExpanded((v) => !v)}
            sx={{ flexShrink: 0 }}
          >
            {panelExpanded ? <ChevronLeftSvg /> : <ChevronRightSvg />}
          </IconButton>
        </Tooltip>
        {panelExpanded ? (
          <>
            <Typography variant="subtitle2" component="h2" sx={{ flex: 1, minWidth: 0 }} noWrap>
              Message log
              {entries.length > 0 ? ` (${entries.length})` : ""}
            </Typography>
            <Button size="small" color="inherit" onClick={onClear} disabled={entries.length === 0}>
              Clear
            </Button>
          </>
        ) : null}
      </Box>

      {panelExpanded ? (
        <Box
          id="message-log-content"
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            px: 1.5,
            py: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No messages yet.
            </Typography>
          ) : (
            newestFirst.map((e) => <FrameBlock key={e.id} entry={e} />)
          )}
        </Box>
      ) : null}
    </Paper>
  );
}
