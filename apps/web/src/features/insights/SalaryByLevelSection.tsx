import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { COUNTRY_CURRENCIES, type InsightsByLevelResponse } from "shared";
import { countryName } from "../../lib/countryName";
import { formatCurrency } from "../../lib/money";
import { InsightsSection } from "./InsightsSection";
import { fetchInsightsByLevel, insightsKeys } from "./insightsApi";

function LevelTable({ data, countryCode }: { data: InsightsByLevelResponse; countryCode: string }) {
  // Amounts use the currency the API reports, never the selection, so they
  // can't be shown under the wrong symbol.
  const money = (amountMinor: string) =>
    formatCurrency(amountMinor, data.currency, { wholeUnits: true });
  const scope = countryCode ? `${countryName(countryCode)} only` : "all countries";

  return (
    <>
      <TableContainer>
        <Table aria-label="Salary by level" size="small">
          <TableHead>
            <TableRow>
              <TableCell>Level</TableCell>
              <TableCell align="right">Minimum</TableCell>
              <TableCell align="right">Median</TableCell>
              <TableCell align="right">Average</TableCell>
              <TableCell align="right">Maximum</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.levels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No active employees</TableCell>
              </TableRow>
            ) : (
              data.levels.map((row) => (
                <TableRow key={row.level}>
                  <TableCell component="th" scope="row">
                    {row.level}
                  </TableCell>
                  <TableCell align="right">{money(row.minSalaryMinor)}</TableCell>
                  <TableCell align="right">{money(row.medianSalaryMinor)}</TableCell>
                  <TableCell align="right">{money(row.averageSalaryMinor)}</TableCell>
                  <TableCell align="right">{money(row.maxSalaryMinor)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {`Amounts in ${data.currency}, ${scope}.`}
      </Typography>
    </>
  );
}

// Salary spread per level, across all countries in USD or for one country in
// its own currency (comparing raw local amounts across currencies would be
// meaningless).
export function SalaryByLevelSection() {
  const [countryCode, setCountryCode] = useState("");

  const query = useQuery({
    queryKey: insightsKeys.byLevel(countryCode || undefined),
    queryFn: () => fetchInsightsByLevel(countryCode || undefined),
  });

  return (
    <InsightsSection
      id="by-level"
      title="Salary by level"
      query={query}
      actions={
        <TextField
          select
          label="Country"
          size="small"
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
          // The empty value is the real "All countries (USD)" option, so the
          // label must always float rather than sit over that text.
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 240 }}
        >
          <option value="">All countries (USD)</option>
          {COUNTRY_CURRENCIES.map((entry) => (
            <option key={entry.countryCode} value={entry.countryCode}>
              {`${countryName(entry.countryCode)} (${entry.currency})`}
            </option>
          ))}
        </TextField>
      }
    >
      {(data) => <LevelTable data={data} countryCode={countryCode} />}
    </InsightsSection>
  );
}
