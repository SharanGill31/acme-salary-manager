import { http, HttpResponse } from "msw";
import type {
  EmployeeDetailResponse,
  EmployeeListItem,
  EmployeeListResponse,
  InsightsByCountryResponse,
  InsightsByDepartmentResponse,
  InsightsByLevelResponse,
  InsightsOutliersResponse,
  InsightsSummaryResponse,
} from "shared";

export const DEFAULT_META = {
  countries: ["GB", "US"],
  departments: [
    { id: 1, name: "Engineering" },
    { id: 2, name: "Sales" },
  ],
  levels: ["L1", "L2", "L3", "L4", "L5", "L6"],
};

export const DEFAULT_EMPLOYEES: EmployeeListItem[] = [
  {
    id: 1,
    employeeCode: "EMP000001",
    fullName: "Ada Lovelace",
    email: "ada.lovelace@acme.example",
    countryCode: "US",
    departmentId: 1,
    departmentName: "Engineering",
    jobTitle: "Software Engineer",
    level: "L3",
    status: "active",
    hireDate: "2020-01-10T00:00:00.000Z",
    salaryMinor: "9000000",
    currency: "USD",
  },
  {
    id: 2,
    employeeCode: "EMP000002",
    fullName: "Grace Hopper",
    email: "grace.hopper@acme.example",
    countryCode: "GB",
    departmentId: 2,
    departmentName: "Sales",
    jobTitle: "Principal Engineer",
    level: "L5",
    status: "active",
    hireDate: "2018-03-22T00:00:00.000Z",
    salaryMinor: "18000000",
    currency: "GBP",
  },
];

export function employeesResponse(items: EmployeeListItem[]): EmployeeListResponse {
  return { items, total: items.length, page: 1, pageSize: 20 };
}

export const DEFAULT_EMPLOYEE_DETAIL: EmployeeDetailResponse = {
  employee: DEFAULT_EMPLOYEES[0],
  salaryHistory: [
    {
      id: 2,
      previousAmountMinor: "8000000",
      newAmountMinor: "9000000",
      currency: "USD",
      effectiveDate: "2023-04-01T00:00:00.000Z",
      reason: "Promotion to L3",
      createdAt: "2023-03-15T10:00:00.000Z",
    },
    {
      id: 1,
      previousAmountMinor: null,
      newAmountMinor: "8000000",
      currency: "USD",
      effectiveDate: "2020-01-10T00:00:00.000Z",
      reason: "Initial salary",
      createdAt: "2020-01-10T00:00:00.000Z",
    },
  ],
  payBand: { level: "L3", countryCode: "US", minMinor: "8000000", maxMinor: "12000000" },
  bandPosition: "within",
  compaRatio: 0.9,
};

// Insights fixtures. Cross-country money is USD minor units (cents).
export const DEFAULT_INSIGHTS_SUMMARY: InsightsSummaryResponse = {
  headcount: 9412,
  totalPayrollUsdMinor: "98765432100",
  medianSalaryUsdMinor: "9850000",
  employeesOutsideBand: 287,
};

export const DEFAULT_INSIGHTS_BY_COUNTRY: InsightsByCountryResponse = [
  {
    countryCode: "GB",
    headcount: 1180,
    totalPayrollUsdMinor: "12390000000",
    averageSalaryUsdMinor: "10500000",
    medianSalaryUsdMinor: "10120000",
  },
  {
    countryCode: "US",
    headcount: 2350,
    totalPayrollUsdMinor: "30550000000",
    averageSalaryUsdMinor: "13000000",
    medianSalaryUsdMinor: "12575050",
  },
];

export const DEFAULT_INSIGHTS_BY_DEPARTMENT: InsightsByDepartmentResponse = [
  {
    departmentId: 1,
    departmentName: "Engineering",
    headcount: 2100,
    totalPayrollUsdMinor: "27300000000",
    averageSalaryUsdMinor: "13000000",
    medianSalaryUsdMinor: "12800000",
  },
  {
    departmentId: 2,
    departmentName: "Sales",
    headcount: 1500,
    totalPayrollUsdMinor: "14250000000",
    averageSalaryUsdMinor: "9500000",
    medianSalaryUsdMinor: "9100000",
  },
];

export const DEFAULT_INSIGHTS_BY_LEVEL_USD: InsightsByLevelResponse = {
  currency: "USD",
  levels: [
    {
      level: "L1",
      minSalaryMinor: "3500000",
      medianSalaryMinor: "5200000",
      averageSalaryMinor: "5350000",
      maxSalaryMinor: "7900000",
    },
    {
      level: "L2",
      minSalaryMinor: "5000000",
      medianSalaryMinor: "7400000",
      averageSalaryMinor: "7525000",
      maxSalaryMinor: "10200000",
    },
  ],
};

export const DEFAULT_INSIGHTS_OUTLIERS: InsightsOutliersResponse = {
  items: [
    {
      id: 7,
      employeeCode: "EMP000007",
      fullName: "Grace Hopper",
      departmentName: "Sales",
      countryCode: "GB",
      level: "L5",
      salaryMinor: "18000000",
      currency: "GBP",
      payBand: { minMinor: "11000000", maxMinor: "15000000" },
      bandPosition: "above",
      compaRatio: 1.38,
    },
    {
      id: 12,
      employeeCode: "EMP000012",
      fullName: "Alan Turing",
      departmentName: "Engineering",
      countryCode: "US",
      level: "L2",
      salaryMinor: "4800000",
      currency: "USD",
      payBand: { minMinor: "6000000", maxMinor: "8000000" },
      bandPosition: "below",
      compaRatio: 0.69,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
};

export const handlers = [
  http.get("/api/meta", () => HttpResponse.json(DEFAULT_META)),
  http.get("/api/insights/summary", () => HttpResponse.json(DEFAULT_INSIGHTS_SUMMARY)),
  http.get("/api/insights/by-country", () => HttpResponse.json(DEFAULT_INSIGHTS_BY_COUNTRY)),
  http.get("/api/insights/by-department", () => HttpResponse.json(DEFAULT_INSIGHTS_BY_DEPARTMENT)),
  http.get("/api/insights/by-level", () => HttpResponse.json(DEFAULT_INSIGHTS_BY_LEVEL_USD)),
  http.get("/api/insights/outliers", () => HttpResponse.json(DEFAULT_INSIGHTS_OUTLIERS)),
  http.get("/api/employees", () => HttpResponse.json(employeesResponse(DEFAULT_EMPLOYEES))),
  http.post("/api/employees", () =>
    HttpResponse.json({ ...DEFAULT_EMPLOYEES[0], id: 3 }, { status: 201 }),
  ),
  http.get("/api/employees/:id", () => HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL)),
  http.patch("/api/employees/:id", () => HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL.employee)),
  http.post("/api/employees/:id/salary-changes", () =>
    HttpResponse.json({ ...DEFAULT_EMPLOYEE_DETAIL, warnings: [] }, { status: 201 }),
  ),
];
