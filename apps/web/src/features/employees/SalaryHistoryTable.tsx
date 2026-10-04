import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { EmployeeDetailResponse } from "shared";
import { formatCurrency } from "../../lib/money";
import { formatDate } from "../../lib/formatDate";

type SalaryChange = EmployeeDetailResponse["salaryHistory"][number];

const changeFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

// The difference is computed in integer minor units; only the ratio (a
// percentage, not money) becomes a float.
function formatChange(previousMinor: string | null, newMinor: string): string {
  if (previousMinor === null || BigInt(previousMinor) === 0n) return "—";
  const previous = BigInt(previousMinor);
  return changeFormat.format(Number(BigInt(newMinor) - previous) / Number(previous));
}

interface SalaryHistoryTableProps {
  history: SalaryChange[];
}

export function SalaryHistoryTable({ history }: SalaryHistoryTableProps) {
  return (
    <Paper component="section" aria-labelledby="salary-history-heading" sx={{ p: 3 }}>
      <Typography id="salary-history-heading" variant="h6" component="h2" sx={{ mb: 2 }}>
        Salary history
      </Typography>
      <TableContainer>
        <Table aria-label="Salary history" size="small">
          <TableHead>
            <TableRow>
              <TableCell>Effective date</TableCell>
              <TableCell align="right">Previous salary</TableCell>
              <TableCell align="right">New salary</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No salary changes recorded</TableCell>
              </TableRow>
            ) : (
              history.map((change) => (
                <TableRow key={change.id}>
                  <TableCell>{formatDate(change.effectiveDate)}</TableCell>
                  <TableCell align="right">
                    {change.previousAmountMinor === null
                      ? "—"
                      : formatCurrency(change.previousAmountMinor, change.currency)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(change.newAmountMinor, change.currency)}
                  </TableCell>
                  <TableCell align="right">
                    {formatChange(change.previousAmountMinor, change.newAmountMinor)}
                  </TableCell>
                  <TableCell>{change.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
