import { http, HttpResponse } from "msw";
import type { EmployeeListItem, EmployeeListResponse } from "shared";

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

export const handlers = [
  http.get("/api/meta", () => HttpResponse.json(DEFAULT_META)),
  http.get("/api/employees", () => HttpResponse.json(employeesResponse(DEFAULT_EMPLOYEES))),
];
