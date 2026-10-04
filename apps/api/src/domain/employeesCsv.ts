import type { EmployeeStatus, Level } from "shared";

export interface EmployeeCsvRow {
  employeeCode: string;
  fullName: string;
  email: string;
  countryCode: string;
  departmentName: string;
  jobTitle: string;
  level: Level;
  status: EmployeeStatus;
  hireDate: Date;
  salaryMinor: number | bigint | string;
  currency: string;
}

const HEADER = [
  "Employee code",
  "Full name",
  "Email",
  "Country",
  "Department",
  "Job title",
  "Level",
  "Status",
  "Hire date",
  "Annual salary",
  "Currency",
];

// Excel needs the byte-order mark to read the file as UTF-8 (accented names).
const BOM = "﻿";
// RFC 4180 line ending.
const CRLF = "\r\n";

const STATUS_LABELS: Record<EmployeeStatus, string> = { active: "Active", inactive: "Inactive" };

function minorDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

// Minor units -> plain decimal ("9000000" GBP -> "90000.00") by string
// arithmetic, so the amount is exact at any size and spreadsheets read it as a
// number (no symbol, no thousands separators).
function minorToDecimal(salaryMinor: EmployeeCsvRow["salaryMinor"], currency: string): string {
  const digits = minorDigits(currency);
  const minor = BigInt(salaryMinor).toString();
  if (digits === 0) return minor;

  const padded = minor.padStart(digits + 1, "0");
  return `${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}

// A spreadsheet runs a cell starting with one of these as a formula (CSV
// injection). A leading apostrophe makes it plain text, per OWASP's guidance.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeField(value: string): string {
  const guarded = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

function toLine(fields: string[]): string {
  return fields.map(escapeField).join(",") + CRLF;
}

// The employee directory as an RFC 4180 CSV file, rows in the given order.
export function buildEmployeesCsv(rows: EmployeeCsvRow[]): string {
  const lines = rows.map((row) =>
    toLine([
      row.employeeCode,
      row.fullName,
      row.email,
      row.countryCode,
      row.departmentName,
      row.jobTitle,
      row.level,
      STATUS_LABELS[row.status],
      row.hireDate.toISOString().slice(0, 10),
      minorToDecimal(row.salaryMinor, row.currency),
      row.currency,
    ]),
  );

  return BOM + toLine(HEADER) + lines.join("");
}
