import type { ReactNode } from "react";
import { Alert, Button, Paper, Skeleton, Typography } from "@mui/material";
import type { UseQueryResult } from "@tanstack/react-query";

interface InsightsSectionProps<T> {
  id: string;
  title: string;
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}

// One page section backed by one query. Each section loads, fails and
// retries on its own, so a single failing request doesn't blank the page.
export function InsightsSection<T>({ id, title, query, children }: InsightsSectionProps<T>) {
  const headingId = `${id}-heading`;

  return (
    <Paper
      component="section"
      aria-labelledby={headingId}
      aria-busy={query.isPending}
      sx={{ p: 3 }}
    >
      <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {query.isPending ? (
        <Skeleton variant="rectangular" height={120} />
      ) : query.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        >
          Could not load this section.
        </Alert>
      ) : (
        children(query.data)
      )}
    </Paper>
  );
}
