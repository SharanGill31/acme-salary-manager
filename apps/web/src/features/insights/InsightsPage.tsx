import { Box, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { countryName } from "../../lib/countryName";
import { BreakdownTable } from "./BreakdownTable";
import { InsightsSection } from "./InsightsSection";
import {
  fetchInsightsByCountry,
  fetchInsightsByDepartment,
  fetchInsightsSummary,
  insightsKeys,
} from "./insightsApi";
import { OutliersSection } from "./OutliersSection";
import { SalaryByLevelSection } from "./SalaryByLevelSection";
import { SummaryTiles } from "./SummaryTiles";

export function InsightsPage() {
  const summaryQuery = useQuery({ queryKey: insightsKeys.summary(), queryFn: fetchInsightsSummary });
  const byCountryQuery = useQuery({
    queryKey: insightsKeys.byCountry(),
    queryFn: fetchInsightsByCountry,
  });
  const byDepartmentQuery = useQuery({
    queryKey: insightsKeys.byDepartment(),
    queryFn: fetchInsightsByDepartment,
  });

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Insights
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Active employees only. Cross-country figures are converted to USD at fixed exchange rates.
      </Typography>

      <Stack spacing={3}>
        <InsightsSection id="summary" title="Summary" query={summaryQuery}>
          {(summary) => <SummaryTiles summary={summary} />}
        </InsightsSection>

        <InsightsSection id="by-country" title="By country" query={byCountryQuery}>
          {(rows) => (
            <BreakdownTable
              label="Headcount and payroll by country"
              groupHeader="Country"
              rows={rows.map((row) => ({
                key: row.countryCode,
                label: countryName(row.countryCode),
                ...row,
              }))}
            />
          )}
        </InsightsSection>

        <InsightsSection id="by-department" title="By department" query={byDepartmentQuery}>
          {(rows) => (
            <BreakdownTable
              label="Headcount and payroll by department"
              groupHeader="Department"
              rows={rows.map((row) => ({
                key: String(row.departmentId),
                label: row.departmentName,
                ...row,
              }))}
            />
          )}
        </InsightsSection>

        <SalaryByLevelSection />

        <OutliersSection />
      </Stack>
    </Box>
  );
}
