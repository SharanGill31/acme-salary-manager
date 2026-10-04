import { Box, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { countryName } from "../../lib/countryName";
import { BreakdownTable, type BreakdownRow } from "./BreakdownTable";
import { PayrollBarChart } from "./PayrollBarChart";
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

interface BreakdownProps {
  groupName: string;
  groupHeader: string;
  rows: BreakdownRow[];
}

// Payroll chart for a quick visual comparison, with the table holding every
// exact figure (and headcount, which is on a different scale and so never
// shares the chart's axis).
function Breakdown({ groupName, groupHeader, rows }: BreakdownProps) {
  return (
    <>
      <PayrollBarChart title={`Total payroll by ${groupName}`} groupName={groupName} data={rows} />
      <BreakdownTable
        label={`Headcount and payroll by ${groupName}`}
        groupHeader={groupHeader}
        rows={rows}
      />
    </>
  );
}

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
          {(data) => (
            <Breakdown
              groupName="country"
              groupHeader="Country"
              rows={data.map((row) => ({
                key: row.countryCode,
                label: countryName(row.countryCode),
                ...row,
              }))}
            />
          )}
        </InsightsSection>

        <InsightsSection id="by-department" title="By department" query={byDepartmentQuery}>
          {(data) => (
            <Breakdown
              groupName="department"
              groupHeader="Department"
              rows={data.map((row) => ({
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
