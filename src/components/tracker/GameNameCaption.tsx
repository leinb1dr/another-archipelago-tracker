import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type GameNameCaptionProps = {
  game: string;
  /** Whether this game is in the user's registered slots list */
  registered: boolean;
  /** Persisted connection accent when this row maps to a registered slot */
  accentColor?: string;
};

/** Muted per-row game label; dot + emphasis when registered (lighter than filled Chips). */
export function GameNameCaption({ game, registered, accentColor }: GameNameCaptionProps) {
  const emphasisColor = registered ? accentColor ?? "primary.main" : "text.secondary";
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.25 }}>
      {registered ? (
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: emphasisColor,
            flexShrink: 0,
          }}
          aria-hidden
        />
      ) : null}
      <Typography
        variant="caption"
        component="span"
        sx={{
          display: "block",
          color: emphasisColor,
          fontWeight: registered ? 600 : 400,
        }}
      >
        {game}
      </Typography>
    </Stack>
  );
}
