import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { RecentConnection } from "../connection/recentConnectionsStorage";

function formatFirstConnected(ms: number): string {
  return new Date(ms).toLocaleString();
}

export type ConnectionViewProps = {
  host: string;
  port: string;
  connectionName: string;
  hostError: string;
  portError: string;
  connecting: boolean;
  formError: string | null;
  recentConnections: RecentConnection[];
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onConnectionNameChange: (value: string) => void;
  onSubmit: () => void;
  onConnectRecent: (rec: RecentConnection) => void;
  onDeleteRecent: (rec: RecentConnection) => void;
};

export function ConnectionView({
  host,
  port,
  connectionName,
  hostError,
  portError,
  connecting,
  formError,
  recentConnections,
  onHostChange,
  onPortChange,
  onConnectionNameChange,
  onSubmit,
  onConnectRecent,
  onDeleteRecent,
}: ConnectionViewProps) {
  return (
    <Stack spacing={3} component="form" noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Typography variant="body1" color="text.secondary">
        Enter the Archipelago server host and port. The first message after connecting must be{" "}
        <Typography component="span" variant="body1" sx={{ fontFamily: "monospace" }}>
          RoomInfo
        </Typography>
        .
      </Typography>

      {recentConnections.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Recent connections
          </Typography>
          <List dense disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            {recentConnections.map((rec) => {
              const title = rec.name?.trim() ? rec.name.trim() : rec.host;
              const subtitleLine1 = rec.name?.trim()
                ? `${rec.host} · Port ${rec.port}`
                : `Port ${rec.port}`;
              const deleteLabel = rec.name?.trim()
                ? `Delete ${rec.name.trim()} ${rec.host} port ${rec.port}`
                : `Delete ${rec.host} port ${rec.port}`;
              return (
                <ListItem
                  key={`${rec.host}:${rec.port}`}
                  secondaryAction={
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Button
                        type="button"
                        size="small"
                        variant="contained"
                        disabled={connecting}
                        onClick={() => onConnectRecent(rec)}
                      >
                        Connect
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        color="inherit"
                        disabled={connecting}
                        onClick={() => onDeleteRecent(rec)}
                        aria-label={deleteLabel}
                      >
                        Delete
                      </Button>
                    </Stack>
                  }
                  sx={{ pr: 22 }}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Stack spacing={0.25} sx={{ pr: 1 }}>
                        <Typography variant="body2" component="div">
                          {title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {subtitleLine1}
                        </Typography>
                        {rec.firstConnectedAt != null ? (
                          <Typography variant="caption" color="text.secondary" component="div">
                            First connected {formatFirstConnected(rec.firstConnectedAt)}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      ) : null}

      {formError ? (
        <Alert severity="error" role="alert">
          {formError}
        </Alert>
      ) : null}

      <TextField
        label="Connection name"
        value={connectionName}
        onChange={(e) => onConnectionNameChange(e.target.value)}
        disabled={connecting}
        fullWidth
        autoComplete="off"
        helperText="Optional label for this server, shown in recent connections."
        slotProps={{ htmlInput: { "aria-label": "Connection name", autoComplete: "off" } }}
      />

      <TextField
        label="Host"
        value={host}
        onChange={(e) => onHostChange(e.target.value)}
        error={Boolean(hostError)}
        helperText={hostError || " "}
        disabled={connecting}
        required
        fullWidth
        autoComplete="off"
        slotProps={{ htmlInput: { "aria-label": "Host", autoComplete: "off" } }}
      />

      <TextField
        label="Port"
        value={port}
        onChange={(e) => onPortChange(e.target.value)}
        error={Boolean(portError)}
        helperText={portError || " "}
        disabled={connecting}
        required
        fullWidth
        autoComplete="off"
        slotProps={{
          htmlInput: { inputMode: "numeric", "aria-label": "Port", autoComplete: "off" },
        }}
      />

      <Box>
        <Button type="submit" variant="contained" disabled={connecting} size="large">
          {connecting ? "Connecting…" : "Connect"}
        </Button>
      </Box>
    </Stack>
  );
}
