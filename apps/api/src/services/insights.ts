import type { Level } from "shared";
import { classifyAgainstBand, compaRatio } from "../domain/payBand";

export interface SummaryResult {
  headcount: number;
  totalPayrollUsd: number;
  medianSalaryUsd: number;
  employeesOutsideBand: number;
}

export interface ByCountryRow {
  countryCode: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
}

export interface ByDepartmentRow {
  departmentId: number;
  departmentName: string;
  headcount: number;
  totalPayrollUsd: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
}

export interface ByLevelRow {
  level: Level;
  minSalary: number;
  medianSalary: number;
  averageSalary: number;
  maxSalary: number;
}

export interface ByLevelResult {
  currency: string;
  levels: ByLevelRow[];
}

export interface OutlierRow {
  id: number;
  employeeCode: string;
  fullName: string;
  departmentName: string;
  countryCode: string;
  level: Level;
  salaryMinor: number;
  currency: string;
  bandMinMinor: number;
  bandMaxMinor: number;
}

export interface OutlierItem {
  id: number;
  employeeCode: string;
  fullName: string;
  departmentName: string;
  countryCode: string;
  level: Level;
  salaryMinor: number;
  currency: string;
  payBand: { minMinor: number; maxMinor: number };
  bandPosition: "below" | "within" | "above";
  compaRatio: number;
}

export interface OutliersResult {
  items: OutlierItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InsightsRepository {
  getSummary(): Promise<SummaryResult>;
  getByCountry(): Promise<ByCountryRow[]>;
  getByDepartment(): Promise<ByDepartmentRow[]>;
  getByLevel(countryCode?: string): Promise<ByLevelResult>;
  getOutliers(page: number, pageSize: number): Promise<{ rows: OutlierRow[]; total: number }>;
}

export async function getSummary(repo: InsightsRepository): Promise<SummaryResult> {
  return repo.getSummary();
}

export async function getByCountry(repo: InsightsRepository): Promise<ByCountryRow[]> {
  return repo.getByCountry();
}

export async function getByDepartment(repo: InsightsRepository): Promise<ByDepartmentRow[]> {
  return repo.getByDepartment();
}

export async function getByLevel(
  repo: InsightsRepository,
  countryCode?: string,
): Promise<ByLevelResult> {
  return repo.getByLevel(countryCode);
}

export async function getOutliers(
  repo: InsightsRepository,
  page: number,
  pageSize: number,
): Promise<OutliersResult> {
  const { rows, total } = await repo.getOutliers(page, pageSize);

  const items = rows.map((row): OutlierItem => {
    const band = { minMinor: BigInt(row.bandMinMinor), maxMinor: BigInt(row.bandMaxMinor) };
    const salary = BigInt(row.salaryMinor);

    return {
      id: row.id,
      employeeCode: row.employeeCode,
      fullName: row.fullName,
      departmentName: row.departmentName,
      countryCode: row.countryCode,
      level: row.level,
      salaryMinor: row.salaryMinor,
      currency: row.currency,
      payBand: { minMinor: row.bandMinMinor, maxMinor: row.bandMaxMinor },
      bandPosition: classifyAgainstBand(salary, band),
      compaRatio: compaRatio(salary, band),
    };
  });

  return { items, total, page, pageSize };
}
