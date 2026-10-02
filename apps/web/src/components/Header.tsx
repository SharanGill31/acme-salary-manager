import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function Header() {
  return (
    <AppBar position="static" component="header">
      <Toolbar>
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
          Acme Salary Manager
        </Typography>
        <Box component="nav" aria-label="Main navigation" sx={{ display: "flex", gap: 1 }}>
          <Button component={RouterLink} to="/employees" color="inherit">
            Employees
          </Button>
          <Button component={RouterLink} to="/insights" color="inherit">
            Insights
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
