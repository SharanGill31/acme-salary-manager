import { describe, expect, it, vi } from "vitest";
import type { CreateEmployeeInput } from "shared";
import { ConflictError, NotFoundError, ValidationError } from "../middleware/errorHandler";
import {
  createEmployee,
  exportEmployees,
  getEmployeeDetail,
  listEmployees,
  updateEmployee,
  type EmployeeListRow,
  type EmployeeRepository,
  type PayBandRow,
  type SalaryChangeRow,
} from "./employees";

const SAMPLE_ROW: EmployeeListRow = {
  id: 1,
  employeeCode: "EMP000001",
  fullName: "Ada Lovelace",
  email: "ada.lovelace@acme.example",
  countryCode: "GB",
  departmentId: 1,
  departmentName: "Engineering",
  jobTitle: "Software Engineer",
  level: "L3",
  status: "active",
  hireDate: new Date("2021-05-01"),
  salaryMinor: 9_000_000,
  currency: "GBP",
};

const SAMPLE_PAY_BAND: PayBandRow = {
  level: "L3",
  countryCode: "GB",
  minMinor: 7_000_000,
  maxMinor: 10_000_000,
};

const SAMPLE_SALARY_HISTORY: SalaryChangeRow[] = [
  {
    id: 2,
    previousAmountMinor: 8_000_000,
    newAmountMinor: 9_000_000,
    currency: "GBP",
    effectiveDate: new Date("2023-01-01"),
    reason: "Annual review",
    createdAt: new Date("2023-01-01"),
  },
  {
    id: 1,
    previousAmountMinor: null,
    newAmountMinor: 8_000_000,
    currency: "GBP",
    effectiveDate: new Date("2021-05-01"),
    reason: "Hire",
    createdAt: new Date("2021-05-01"),
  },
];

const CREATE_INPUT: CreateEmployeeInput = {
  full_name: "New Hire",
  email: "new.hire@acme.example",
  employee_code: "EMP999999",
  country_code: "US",
  department_id: 1,
  job_title: "Analyst",
  level: "L2",
  hire_date: new Date("2026-01-01"),
  salary_minor: 6_000_000,
  currency: "USD",
  status: "active",
};

function createFakeRepo(overrides: Partial<EmployeeRepository> = {}): EmployeeRepository {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(undefined),
    findSalaryHistory: vi.fn().mockResolvedValue([]),
    findPayBand: vi.fn().mockResolvedValue(undefined),
    emailExists: vi.fn().mockResolvedValue(false),
    employeeCodeExists: vi.fn().mockResolvedValue(false),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
}

describe("listEmployees", () => {
  it("applies default paging and sorting when no filters are given", async () => {
    const repo = createFakeRepo();

    await listEmployees(repo, {});

    expect(repo.findMany).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      sortBy: "full_name",
      sortDir: "asc",
    });
  });

  it("passes through provided filters unchanged alongside the defaults", async () => {
    const repo = createFakeRepo();

    await listEmployees(repo, {
      countryCode: "US",
      level: "L3",
      status: "active",
      departmentId: 2,
      search: "john",
    });

    expect(repo.findMany).toHaveBeenCalledWith({
      countryCode: "US",
      level: "L3",
      status: "active",
      departmentId: 2,
      search: "john",
      page: 1,
      pageSize: 20,
      sortBy: "full_name",
      sortDir: "asc",
    });
  });

  it("overrides defaults when paging and sorting are provided", async () => {
    const repo = createFakeRepo();

    await listEmployees(repo, { page: 3, pageSize: 50, sortBy: "hire_date", sortDir: "desc" });

    expect(repo.findMany).toHaveBeenCalledWith({
      page: 3,
      pageSize: 50,
      sortBy: "hire_date",
      sortDir: "desc",
    });
  });

  it("returns the repository's items and total alongside the resolved page and pageSize", async () => {
    const repo = createFakeRepo({
      findMany: vi.fn().mockResolvedValue([SAMPLE_ROW]),
      count: vi.fn().mockResolvedValue(42),
    });

    const result = await listEmployees(repo, { page: 2, pageSize: 10 });

    expect(result).toEqual({ items: [SAMPLE_ROW], total: 42, page: 2, pageSize: 10 });
  });
});

describe("getEmployeeDetail", () => {
  it("returns the employee with history, pay band, band position and compa ratio", async () => {
    const repo = createFakeRepo({
      findById: vi.fn().mockResolvedValue(SAMPLE_ROW),
      findSalaryHistory: vi.fn().mockResolvedValue(SAMPLE_SALARY_HISTORY),
      findPayBand: vi.fn().mockResolvedValue(SAMPLE_PAY_BAND),
    });

    const result = await getEmployeeDetail(repo, 1);

    expect(result.employee).toEqual(SAMPLE_ROW);
    expect(result.salaryHistory).toEqual(SAMPLE_SALARY_HISTORY);
    expect(result.payBand).toEqual(SAMPLE_PAY_BAND);
    expect(result.bandPosition).toBe("within");
    expect(result.compaRatio).toBe(1.06);
  });

  it("throws NotFoundError when the employee does not exist", async () => {
    const repo = createFakeRepo({ findById: vi.fn().mockResolvedValue(undefined) });

    await expect(getEmployeeDetail(repo, 999)).rejects.toThrow(NotFoundError);
  });
});

describe("exportEmployees", () => {
  const clock = { today: () => new Date("2026-10-04T15:30:00.000Z") };

  it("fetches every matching row with the default sort and no paging", async () => {
    const repo = createFakeRepo();

    await exportEmployees(repo, clock, { countryCode: "GB", status: "active" });

    expect(repo.findAll).toHaveBeenCalledWith({
      countryCode: "GB",
      status: "active",
      sortBy: "full_name",
      sortDir: "asc",
    });
  });

  it("returns the rows as CSV, named with today's date", async () => {
    const repo = createFakeRepo({ findAll: vi.fn().mockResolvedValue([SAMPLE_ROW]) });

    const result = await exportEmployees(repo, clock, { sortBy: "hire_date", sortDir: "desc" });

    expect(repo.findAll).toHaveBeenCalledWith({ sortBy: "hire_date", sortDir: "desc" });
    expect(result.filename).toBe("employees-2026-10-04.csv");
    expect(result.csv).toContain(
      "EMP000001,Ada Lovelace,ada.lovelace@acme.example,GB,Engineering,Software Engineer,L3,Active,2021-05-01,90000.00,GBP\r\n",
    );
  });
});

describe("createEmployee", () => {
  it("creates the employee and first salary history row", async () => {
    const created = { ...SAMPLE_ROW, id: 42 };
    const createFn = vi.fn().mockResolvedValue(created);
    const repo = createFakeRepo({ create: createFn });

    const result = await createEmployee(repo, CREATE_INPUT);

    expect(createFn).toHaveBeenCalledWith(CREATE_INPUT);
    expect(result).toEqual(created);
  });

  it("throws ConflictError when the email already exists", async () => {
    const repo = createFakeRepo({ emailExists: vi.fn().mockResolvedValue(true) });

    await expect(createEmployee(repo, CREATE_INPUT)).rejects.toThrow(ConflictError);
  });

  it("throws ConflictError when the employee_code already exists", async () => {
    const repo = createFakeRepo({ employeeCodeExists: vi.fn().mockResolvedValue(true) });

    await expect(createEmployee(repo, CREATE_INPUT)).rejects.toThrow(ConflictError);
  });

  it("throws ValidationError and creates nothing when the currency doesn't match the country", async () => {
    const repo = createFakeRepo();

    await expect(
      createEmployee(repo, { ...CREATE_INPUT, country_code: "US", currency: "GBP" }),
    ).rejects.toMatchObject({
      constructor: ValidationError,
      errors: { currency: "Currency must be the country's currency (USD)" },
    });
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("updateEmployee", () => {
  it("updates allowed profile fields", async () => {
    const updated = { ...SAMPLE_ROW, fullName: "Updated Name" };
    const updateFn = vi.fn().mockResolvedValue(updated);
    const repo = createFakeRepo({
      findById: vi.fn().mockResolvedValue(SAMPLE_ROW),
      update: updateFn,
    });

    const result = await updateEmployee(repo, 1, { full_name: "Updated Name" });

    expect(updateFn).toHaveBeenCalledWith(1, { full_name: "Updated Name" });
    expect(result).toEqual(updated);
  });

  it("throws NotFoundError when the employee does not exist", async () => {
    const repo = createFakeRepo({ findById: vi.fn().mockResolvedValue(undefined) });

    await expect(updateEmployee(repo, 999, { full_name: "x" })).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when the new email belongs to another employee", async () => {
    const emailExists = vi.fn().mockResolvedValue(true);
    const repo = createFakeRepo({
      findById: vi.fn().mockResolvedValue(SAMPLE_ROW),
      emailExists,
    });

    await expect(
      updateEmployee(repo, 1, { email: "taken@acme.example" }),
    ).rejects.toThrow(ConflictError);

    expect(emailExists).toHaveBeenCalledWith("taken@acme.example", 1);
  });

  it("does not check for an email conflict when email is not being changed", async () => {
    const emailExists = vi.fn().mockResolvedValue(false);
    const repo = createFakeRepo({
      findById: vi.fn().mockResolvedValue(SAMPLE_ROW),
      emailExists,
      update: vi.fn().mockResolvedValue(SAMPLE_ROW),
    });

    await updateEmployee(repo, 1, { job_title: "New Title" });

    expect(emailExists).not.toHaveBeenCalled();
  });
});
