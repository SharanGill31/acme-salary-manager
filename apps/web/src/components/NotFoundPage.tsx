import { Typography } from "@mui/material";

export function NotFoundPage() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Typography>The page you're looking for doesn't exist.</Typography>
    </>
  );
}
