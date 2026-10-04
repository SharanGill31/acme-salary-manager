import { useState } from "react";
import {
  Chip,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { InsightsOutliersResponse } from "shared";
import { BAND_POSITION_COLORS, BAND_POSITION_LABELS } from "../../lib/bandPosition";
import { countryName } from "../../lib/countryName";
import { formatCurrency } from "../../lib/money";
import { InsightsSection } from "./InsightsSection";
import { fetchInsightsOutliers, insightsKeys } from "./insightsApi";

const PAGE_SIZE = 20;

const percentFormat = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

interface OutliersTableProps {
  data: InsightsOutliersResponse;
  page: number;
  onPageChange: (page: number) => void;
}

function OutliersTable({ data, page, onPageChange }: OutliersTableProps) {
  if (data.total === 0) {
    return <Typography>No active employees are outside their pay band.</Typography>;
  }

  return (
    <>
      <TableContainer>
        <Table aria-label="Employees outside their pay band" size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Level</TableCell>
              <TableCell align="right">Salary</TableCell>
              <TableCell align="right">Pay band</TableCell>
              <TableCell>Position</TableCell>
              <TableCell align="right">Compa-ratio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell component="th" scope="row">
                  <Link component={RouterLink} to={`/employees/${item.id}`}>
                    {item.fullName}
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    {item.employeeCode}
                  </Typography>
                </TableCell>
                <TableCell>{countryName(item.countryCode)}</TableCell>
                <TableCell>{item.level}</TableCell>
                {/* Each employee's amounts are in their own currency. */}
                <TableCell align="right">{formatCurrency(item.salaryMinor, item.currency)}</TableCell>
                <TableCell align="right">
                  {`${formatCurrency(item.payBand.minMinor, item.currency)} – ${formatCurrency(item.payBand.maxMinor, item.currency)}`}
                </TableCell>
                <TableCell>
                  <Chip
                    label={BAND_POSITION_LABELS[item.bandPosition]}
                    color={BAND_POSITION_COLORS[item.bandPosition]}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{percentFormat.format(item.compaRatio)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={data.total}
        page={page - 1}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
        onPageChange={(_event, newPageIndex) => onPageChange(newPageIndex + 1)}
      />
    </>
  );
}

// Pagination happens on the server; the previous page stays on screen while
// the next one loads.
export function OutliersSection() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: insightsKeys.outliers(page, PAGE_SIZE),
    queryFn: () => fetchInsightsOutliers(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  return (
    <InsightsSection id="outliers" title="Employees outside their pay band" query={query}>
      {(data) => <OutliersTable data={data} page={page} onPageChange={setPage} />}
    </InsightsSection>
  );
}
