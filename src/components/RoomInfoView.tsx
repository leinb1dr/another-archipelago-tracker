import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { RoomInfo } from "../protocol/roomInfo";

function formatVersion(v: { major: number; minor: number; build: number }): string {
  return `${v.major}.${v.minor}.${v.build}`;
}

export type RoomInfoViewProps = {
  room: RoomInfo;
};

export function RoomInfoView({ room }: RoomInfoViewProps) {
  const serverTime =
    typeof room.time === "number" && Number.isFinite(room.time)
      ? new Date(room.time * 1000).toLocaleString()
      : "—";

  const permissionLabels: Record<string, string> = {
    release: "Release",
    collect: "Collect",
    remaining: "Remaining",
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title="Room info"
        subheader={`Seed: ${room.seed_name}`}
        slotProps={{ title: { component: "h2" } }}
      />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
            <Chip size="small" label={room.password ? "Password required" : "No password"} variant="outlined" />
            {room.tags.map((tag) => (
              <Chip key={tag} size="small" label={tag} />
            ))}
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Server version
            </Typography>
            <Typography variant="body2">{formatVersion(room.version)}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Generator version
            </Typography>
            <Typography variant="body2">{formatVersion(room.generator_version)}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Hint cost / check points
            </Typography>
            <Typography variant="body2">
              {room.hint_cost}% · {room.location_check_points} pt(s) per check
            </Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Server time
            </Typography>
            <Typography variant="body2">{serverTime}</Typography>
          </Stack>

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Permissions
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
            {Object.entries(room.permissions).map(([key, value]) => (
              <Chip
                key={key}
                size="small"
                label={`${permissionLabels[key] ?? key}: ${String(value)}`}
                variant="outlined"
              />
            ))}
          </Stack>

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Games ({room.games.length})
          </Typography>
          <Box
            sx={{
              maxHeight: 280,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <List dense disablePadding>
              {room.games.map((name) => (
                <ListItem key={name} disableGutters sx={{ px: 2 }}>
                  <ListItemText primary={<Typography variant="body2">{name}</Typography>} />
                </ListItem>
              ))}
            </List>
          </Box>

          {room.datapackage_checksums && Object.keys(room.datapackage_checksums).length > 0 ? (
            <>
              <Typography variant="caption" color="text.secondary">
                Data package checksums: {Object.keys(room.datapackage_checksums).length}{" "}
                {Object.keys(room.datapackage_checksums).length === 1 ? "entry" : "entries"}
              </Typography>
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
