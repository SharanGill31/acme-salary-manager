import type { ReactNode } from "react";
import { Box, Link, Typography } from "@mui/material";
import type { InsightsSummaryResponse } from "shared";
import { formatCurrency } from "../../lib/money";
import { formatCount } from "./formatCount";

interface SummaryTilesProps {
  summary: InsightsSummaryResponse;
}

interface Tile {
  term: string;
  value: string;
  extra?: ReactNode;
}

// Headline numbers as stat tiles: a term and a large value, laid out as a
// definition list so each value is read together with its label.
export function SummaryTiles({ summary }: SummaryTilesProps) {
  const tiles: Tile[] = [
    { term: "Headcount", value: formatCount(summary.headcount) },
    {
      term: "Total payroll",
      value: formatCurrency(summary.totalPayrollUsdMinor, "USD", { wholeUnits: true }),
    },
    {
      term: "Median salary",
      value: formatCurrency(summary.medianSalaryUsdMinor, "USD", { wholeUnits: true }),
    },
    {
      term: "Outside pay band",
      value: formatCount(summary.employeesOutsideBand),
      // The accessible name starts with the visible text, so speech-input
      // users can say "View list".
      extra: (
        <Link
          href="#outliers"
          aria-label="View list of employees outside their pay band"
          variant="body2"
          sx={{ display: "block", mt: 0.5 }}
        >
          View list
        </Link>
      ),
    },
  ];

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
      }}
    >
      {tiles.map(({ term, value, extra }) => (
        <Box key={term} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
          <Typography component="dt" color="text.secondary">
            {term}
          </Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            <Typography component="span" variant="h5" sx={{ display: "block", fontWeight: 600 }}>
              {value}
            </Typography>
            {extra}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
