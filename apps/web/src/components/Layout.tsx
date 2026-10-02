import { Box, Container } from "@mui/material";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";
import { Header } from "./Header";
import { SkipLink } from "./SkipLink";

export function Layout() {
  return (
    <>
      <SkipLink />
      <Header />
      <Box component="main" id="main-content">
        <Container sx={{ paddingY: 4 }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Container>
      </Box>
    </>
  );
}
