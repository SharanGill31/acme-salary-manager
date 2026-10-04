import { formatCurrency } from "../../lib/money";

export interface PayrollChartDatum {
  label: string;
  totalPayrollUsdMinor: string;
}

function usd(amountMinor: string): string {
  return formatCurrency(amountMinor, "USD", { wholeUnits: true });
}

// The text alternative for a payroll bar chart: what it plots, its largest
// and smallest groups, and where the exact figures are. Amounts are compared
// as BigInt so the extremes are exact.
export function describePayrollChart(groupName: string, data: PayrollChartDatum[]): string {
  const intro = `Bar chart of total payroll by ${groupName} in USD.`;
  if (data.length === 0) return `${intro} No active employees.`;

  const tail = "Exact figures are in the table below.";
  if (data.length === 1) {
    const [only] = data;
    return `${intro} ${only.label}, ${usd(only.totalPayrollUsdMinor)}. ${tail}`;
  }

  const byAmount = (a: PayrollChartDatum, b: PayrollChartDatum) => {
    const difference = BigInt(a.totalPayrollUsdMinor) - BigInt(b.totalPayrollUsdMinor);
    return difference > 0n ? 1 : difference < 0n ? -1 : 0;
  };
  const largest = data.reduce((best, datum) => (byAmount(datum, best) > 0 ? datum : best));
  const smallest = data.reduce((best, datum) => (byAmount(datum, best) < 0 ? datum : best));

  return (
    `${intro} Largest: ${largest.label}, ${usd(largest.totalPayrollUsdMinor)}. ` +
    `Smallest: ${smallest.label}, ${usd(smallest.totalPayrollUsdMinor)}. ${tail}`
  );
}
