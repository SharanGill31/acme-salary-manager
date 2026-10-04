import { describe, expect, it } from "vitest";
import { describePayrollChart } from "./payrollChartSummary";

describe("describePayrollChart", () => {
  it("names the chart and its largest and smallest groups, in whole dollars", () => {
    expect(
      describePayrollChart("country", [
        { label: "United Kingdom", totalPayrollUsdMinor: "12390000000" },
        { label: "United States", totalPayrollUsdMinor: "30550000000" },
        { label: "India", totalPayrollUsdMinor: "980000000" },
      ]),
    ).toBe(
      "Bar chart of total payroll by country in USD. Largest: United States, $305,500,000. " +
        "Smallest: India, $9,800,000. Exact figures are in the table below.",
    );
  });

  it("compares amounts exactly, beyond the float-safe range", () => {
    expect(
      describePayrollChart("department", [
        { label: "A", totalPayrollUsdMinor: "900719925474099311" },
        { label: "B", totalPayrollUsdMinor: "900719925474099312" },
      ]),
    ).toContain("Largest: B,");
  });

  it("describes a single group without repeating it as smallest", () => {
    expect(
      describePayrollChart("department", [
        { label: "Engineering", totalPayrollUsdMinor: "27300000000" },
      ]),
    ).toBe(
      "Bar chart of total payroll by department in USD. Engineering, $273,000,000. " +
        "Exact figures are in the table below.",
    );
  });

  it("says so when there is nothing to chart", () => {
    expect(describePayrollChart("country", [])).toBe(
      "Bar chart of total payroll by country in USD. No active employees.",
    );
  });
});
