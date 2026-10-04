import { useId } from "react";
import { Box, Paper, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { formatCurrency } from "../../lib/money";
import { describePayrollChart, type PayrollChartDatum } from "./payrollChartSummary";

// Validated with the data-viz palette script against the white chart
// surface: categorical slot 1 / default sequential blue, >= 3:1 contrast.
const BAR_COLOR = "#2a78d6";
const GRID_COLOR = "#e1e0d9";
const AXIS_COLOR = "#c3c2b7";
const SECONDARY_INK = "#52514e";
const MUTED_INK = "#898781";

const ROW_HEIGHT = 36;
const AXIS_HEIGHT = 40;

interface ChartRow extends PayrollChartDatum {
  // Integer USD cents, used only to position the bar. Displayed amounts
  // always come from the exact totalPayrollUsdMinor string.
  value: number;
}

function PayrollTooltip({ active, payload }: TooltipContentProps<TooltipValueType, number | string>) {
  const row = payload?.[0]?.payload as ChartRow | undefined;
  if (!active || !row) return null;

  // Value leads, label follows.
  return (
    <Paper elevation={3} sx={{ px: 1.5, py: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatCurrency(row.totalPayrollUsdMinor, "USD", { wholeUnits: true })}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {row.label}
      </Typography>
    </Paper>
  );
}

interface PayrollBarChartProps {
  title: string;
  groupName: string;
  data: PayrollChartDatum[];
}

// A single-series horizontal bar chart of total payroll. The figure's image
// carries a text description, and the table beside it holds every exact
// value, so the chart enhances but never gates the numbers.
export function PayrollBarChart({ title, groupName, data }: PayrollBarChartProps) {
  const captionId = useId();
  const rows: ChartRow[] = data.map((datum) => ({
    ...datum,
    value: Number(datum.totalPayrollUsdMinor),
  }));
  const height = rows.length * ROW_HEIGHT + AXIS_HEIGHT;

  return (
    <Box component="figure" aria-labelledby={captionId} sx={{ m: 0, mb: 3 }}>
      <Typography id={captionId} component="figcaption" variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box role="img" aria-label={describePayrollChart(groupName, data)} sx={{ height }}>
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
            {/* The keyboard layer is off: the wrapper is a single image to
                assistive tech, and every value is in the table below. */}
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} accessibilityLayer={false}>
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
              <XAxis
                type="number"
                stroke={AXIS_COLOR}
                tick={{ fill: MUTED_INK, fontSize: 12 }}
                tickFormatter={(tick: number) =>
                  formatCurrency(String(Math.round(tick)), "USD", { compact: true })
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                width={150}
                stroke={AXIS_COLOR}
                tickLine={false}
                tick={{ fill: SECONDARY_INK, fontSize: 13 }}
              />
              <Tooltip content={PayrollTooltip} cursor={{ fill: "rgba(42, 120, 214, 0.08)" }} />
              <Bar
                dataKey="value"
                fill={BAR_COLOR}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
}
