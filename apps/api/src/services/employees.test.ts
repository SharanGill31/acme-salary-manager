import { describe, expect, it } from "vitest";
import type { CleanEmployeeListQuery, EmployeeListRow, EmployeeRepository } from "./employees";
import { listEmployees } from "./employees";

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

function createFakeRepo(rows: EmployeeListRow[], total: number): {
  repo: EmployeeRepository;
  calls: CleanEmployeeListQuery[];
} {
  const calls: CleanEmployeeListQuery[] = [];

  return {
    repo: {
      async findMany(query: CleanEmployeeListQuery) {
        calls.push(query);
        return rows;
      },
      async count(query: CleanEmployeeListQuery) {
        calls.push(query);
        return total;
      },
    },
    calls,
  };
}

describe("listEmployees", () => {
  it("applies default paging and sorting when no filters are given", async () => {
    const { repo, calls } = createFakeRepo([], 0);

    await listEmployees(repo, {});

    expect(calls[0]).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: "full_name",
      sortDir: "asc",
    });
  });

  it("passes through provided filters unchanged alongside the defaults", async () => {
    const { repo, calls } = createFakeRepo([], 0);

    await listEmployees(repo, {
      countryCode: "US",
      level: "L3",
      status: "active",
      departmentId: 2,
      search: "john",
    });

    expect(calls[0]).toEqual({
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
    const { repo, calls } = createFakeRepo([], 0);

    await listEmployees(repo, { page: 3, pageSize: 50, sortBy: "hire_date", sortDir: "desc" });

    expect(calls[0]).toEqual({
      page: 3,
      pageSize: 50,
      sortBy: "hire_date",
      sortDir: "desc",
    });
  });

  it("returns the repository's items and total alongside the resolved page and pageSize", async () => {
    const { repo } = createFakeRepo([SAMPLE_ROW], 42);

    const result = await listEmployees(repo, { page: 2, pageSize: 10 });

    expect(result).toEqual({ items: [SAMPLE_ROW], total: 42, page: 2, pageSize: 10 });
  });
});
