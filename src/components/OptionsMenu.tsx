import Check from "@mui/icons-material/Check";
import Settings from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import { useThemeMode } from "../theme/AppThemeProvider";

export function OptionsMenu() {
  const { mode, setMode } = useThemeMode();
  const menuId = useId();
  const btnId = `${menuId}-options-btn`;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <IconButton
        id={btnId}
        color="inherit"
        aria-label="Open options"
        aria-controls={open ? menuId : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        edge="end"
        size="small"
      >
        <Settings />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          list: {
            "aria-labelledby": btnId,
            dense: true,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, pb: 0.5 }}>
          <Typography variant="overline" color="text.secondary" component="p" sx={{ m: 0 }}>
            Theme
          </Typography>
        </Box>
        <MenuItem
          selected={mode === "light"}
          onClick={() => {
            setMode("light");
            setAnchor(null);
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {mode === "light" ? <Check fontSize="small" sx={{ color: "primary.main" }} /> : null}
          </ListItemIcon>
          <Typography variant="body2" component="span">
            Light
          </Typography>
        </MenuItem>
        <MenuItem
          selected={mode === "dark"}
          onClick={() => {
            setMode("dark");
            setAnchor(null);
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {mode === "dark" ? <Check fontSize="small" sx={{ color: "primary.main" }} /> : null}
          </ListItemIcon>
          <Typography variant="body2" component="span">
            Dark
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
