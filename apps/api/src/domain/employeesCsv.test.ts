import { describe, expect, it } from "vitest";
import { buildEmployeesCsv, type EmployeeCsvRow } from "./employeesCsv";

const BOM = "\uFEFF";
const HEADER =
  "Employee code,Full name,Email,Country,Department,Job title,Level,Status,Hire date,Annual salary,Currency";

function row(overrides: Partial<EmployeeCsvRow> = {}): EmployeeCsvRow {
  return {
    employeeCode: "EMP000001",
    fullName: "Ada Lovelace",
    email: "ada.lovelace@acme.example",
    countryCode: "GB",
    departmentName: "Engineering",
    jobTitle: "Software Engineer",
    level: "L3",
    status: "active",
    hireDate: new Date("2021-05-01T00:00:00.000Z"),
    salaryMinor: 9_000_000,
    currency: "GBP",
    ...overrides,
  };
}

// The data lines, without the BOM, header or the trailing line ending.
function dataLines(csv: string): string[] {
  return csv.slice(BOM.length).split("\r\n").slice(1, -1);
}

describe("buildEmployeesCsv", () => {
  it("starts with a UTF-8 BOM and the header, and ends every line with CRLF", () => {
    const csv = buildEmployeesCsv([row()]);

    expect(csv.startsWith(`${BOM}${HEADER}\r\n`)).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes one line per employee in the given order", () => {
    const csv = buildEmployeesCsv([
      row(),
      row({
        employeeCode: "EMP000002",
        fullName: "Grace Hopper",
        email: "grace.hopper@acme.example",
        countryCode: "US",
        departmentName: "Sales",
        jobTitle: "Principal Engineer",
        level: "L5",
        status: "inactive",
        hireDate: new Date("2018-03-22T00:00:00.000Z"),
        salaryMinor: 18_000_050,
        currency: "USD",
      }),
    ]);

    expect(dataLines(csv)).toEqual([
      "EMP000001,Ada Lovelace,ada.lovelace@acme.example,GB,Engineering,Software Engineer,L3,Active,2021-05-01,90000.00,GBP",
      "EMP000002,Grace Hopper,grace.hopper@acme.example,US,Sales,Principal Engineer,L5,Inactive,2018-03-22,180000.50,USD",
    ]);
  });

  it("writes only the header for an empty list", () => {
    expect(buildEmployeesCsv([])).toBe(`${BOM}${HEADER}\r\n`);
  });

  it("writes salaries as exact plain decimals, with no symbol or separators", () => {
    const amounts = (salaryMinor: EmployeeCsvRow["salaryMinor"], currency = "USD") =>
      dataLines(buildEmployeesCsv([row({ salaryMinor, currency })]))[0].split(",")[9];

    expect(amounts(5)).toBe("0.05");
    expect(amounts(100)).toBe("1.00");
    expect(amounts("900719925474099312")).toBe("9007199254740993.12");
    expect(amounts(12_345n)).toBe("123.45");
    // A currency with no minor units has no decimal part.
    expect(amounts(12_345, "JPY")).toBe("12345");
  });

  it("writes hire dates as the UTC calendar day", () => {
    const line = dataLines(
      buildEmployeesCsv([row({ hireDate: new Date("2020-01-10T23:30:00.000Z") })]),
    )[0];

    expect(line.split(",")[8]).toBe("2020-01-10");
  });

  it("quotes fields containing commas, quotes or line breaks, doubling quotes", () => {
    const line = buildEmployeesCsv([
      row({
        fullName: 'Ada "The Countess" Lovelace',
        jobTitle: "Engineer, Analytical",
        departmentName: "Research\nand Development",
      }),
    ]).slice(BOM.length + HEADER.length + 2);

    expect(line).toContain(',"Ada ""The Countess"" Lovelace",');
    expect(line).toContain(',"Research\nand Development",');
    expect(line).toContain(',"Engineer, Analytical",');
  });

  it("neutralises values a spreadsheet would run as formulas", () => {
    const fields = (fullName: string) =>
      dataLines(buildEmployeesCsv([row({ fullName })]))[0].split(",")[1];

    expect(fields("=1+1")).toBe("'=1+1");
    expect(fields("+44 7700 900000")).toBe("'+44 7700 900000");
    expect(fields("-5")).toBe("'-5");
    expect(fields("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(fields("\tTabbed")).toBe("'\tTabbed");
    // Ordinary text is untouched, including a dash that isn't first.
    expect(fields("Mary-Jane Smith")).toBe("Mary-Jane Smith");
  });

  it("guards and quotes a formula that also contains a comma", () => {
    const line = buildEmployeesCsv([row({ jobTitle: '=HYPERLINK("http://x","click")' })]);

    expect(line).toContain(`,"'=HYPERLINK(""http://x"",""click"")",`);
  });
});
