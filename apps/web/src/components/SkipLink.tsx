import { Box } from "@mui/material";

export function SkipLink() {
  return (
    <Box
      component="a"
      href="#main-content"
      sx={{
        position: "absolute",
        top: 0,
        left: -9999,
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        padding: 2,
        backgroundColor: "background.paper",
        color: "text.primary",
        "&:focus": {
          left: 8,
          top: 8,
        },
      }}
    >
      Skip to main content
    </Box>
  );
}
