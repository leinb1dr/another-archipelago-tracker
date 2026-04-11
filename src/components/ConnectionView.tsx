import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export type ConnectionViewProps = {
  host: string;
  port: string;
  hostError: string;
  portError: string;
  connecting: boolean;
  formError: string | null;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onSubmit: () => void;
};

export function ConnectionView({
  host,
  port,
  hostError,
  portError,
  connecting,
  formError,
  onHostChange,
  onPortChange,
  onSubmit,
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
