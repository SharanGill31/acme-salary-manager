import { Box, Typography } from "@mui/material";
import type { InsightsSummaryResponse } from "shared";
import { formatCurrency } from "../../lib/money";
import { formatCount } from "./formatCount";

interface SummaryTilesProps {
  summary: InsightsSummaryResponse;
}

// Headline numbers as stat tiles: a term and a large value, laid out as a
// definition list so each value is read together with its label.
export function SummaryTiles({ summary }: SummaryTilesProps) {
  const tiles: [string, string][] = [
    ["Headcount", formatCount(summary.headcount)],
    ["Total payroll", formatCurrency(summary.totalPayrollUsdMinor, "USD", { wholeUnits: true })],
    ["Median salary", formatCurrency(summary.medianSalaryUsdMinor, "USD", { wholeUnits: true })],
    ["Outside pay band", formatCount(summary.employeesOutsideBand)],
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
      {tiles.map(([term, value]) => (
        <Box
          key={term}
          sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}
        >
          <Typography component="dt" color="text.secondary">
            {term}
          </Typography>
          <Typography component="dd" variant="h5" sx={{ m: 0, fontWeight: 600 }}>
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
