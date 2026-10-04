import { http, HttpResponse } from "msw";
import type { EmployeeDetailResponse, EmployeeListItem, EmployeeListResponse } from "shared";

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

export const handlers = [
  http.get("/api/meta", () => HttpResponse.json(DEFAULT_META)),
  http.get("/api/employees", () => HttpResponse.json(employeesResponse(DEFAULT_EMPLOYEES))),
  http.get("/api/employees/:id", () => HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL)),
  http.patch("/api/employees/:id", () => HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL.employee)),
  http.post("/api/employees/:id/salary-changes", () =>
    HttpResponse.json({ ...DEFAULT_EMPLOYEE_DETAIL, warnings: [] }, { status: 201 }),
  ),
];
