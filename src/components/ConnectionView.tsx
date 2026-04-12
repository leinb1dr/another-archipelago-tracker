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

export type ConnectionViewProps = {
  host: string;
  port: string;
  hostError: string;
  portError: string;
  connecting: boolean;
  formError: string | null;
  recentConnections: RecentConnection[];
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onSubmit: () => void;
  onConnectRecent: (rec: RecentConnection) => void;
  onDeleteRecent: (rec: RecentConnection) => void;
};

export function ConnectionView({
  host,
  port,
  hostError,
  portError,
  connecting,
  formError,
  recentConnections,
  onHostChange,
  onPortChange,
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
            {recentConnections.map((rec) => (
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
                      aria-label={`Delete ${rec.host} port ${rec.port}`}
                    >
                      Delete
                    </Button>
                  </Stack>
                }
                sx={{ pr: 22 }}
              >
                <ListItemText
                  primary={<Typography variant="body2">{rec.host}</Typography>}
                  secondary={
                    <Typography component="span" variant="caption" color="text.secondary">
                      Port {rec.port}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      ) : null}

      {formError ? (
        <Alert severity="error" role="alert">
          {formError}
        </Alert>
      ) : null}

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
