import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { formatCurrency } from "../../lib/money";
import { formatCount } from "./formatCount";

export interface BreakdownRow {
  key: string;
  label: string;
  headcount: number;
  totalPayrollUsdMinor: string;
  averageSalaryUsdMinor: string;
  medianSalaryUsdMinor: string;
}

interface BreakdownTableProps {
  label: string;
  groupHeader: string;
  rows: BreakdownRow[];
}

function usd(amountMinor: string): string {
  return formatCurrency(amountMinor, "USD", { wholeUnits: true });
}

// Headcount and payroll for one grouping (country or department). Rows stay
// in the API's order: sorting happens in SQL, never in the browser.
export function BreakdownTable({ label, groupHeader, rows }: BreakdownTableProps) {
  return (
    <TableContainer>
      <Table aria-label={label} size="small">
        <TableHead>
          <TableRow>
            <TableCell>{groupHeader}</TableCell>
            <TableCell align="right">Headcount</TableCell>
            <TableCell align="right">Total payroll</TableCell>
            <TableCell align="right">Average salary</TableCell>
            <TableCell align="right">Median salary</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>No active employees</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell component="th" scope="row">
                  {row.label}
                </TableCell>
                <TableCell align="right">{formatCount(row.headcount)}</TableCell>
                <TableCell align="right">{usd(row.totalPayrollUsdMinor)}</TableCell>
                <TableCell align="right">{usd(row.averageSalaryUsdMinor)}</TableCell>
                <TableCell align="right">{usd(row.medianSalaryUsdMinor)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
