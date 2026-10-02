import type { EmployeeSortColumn, EmployeeStatus, Level } from "shared";

export interface RawEmployeeListQuery {
  search?: string;
  countryCode?: string;
  departmentId?: number;
  level?: Level;
  status?: EmployeeStatus;
  sortBy?: EmployeeSortColumn;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CleanEmployeeListQuery {
  search?: string;
  countryCode?: string;
  departmentId?: number;
  level?: Level;
  status?: EmployeeStatus;
  sortBy: EmployeeSortColumn;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface EmployeeListRow {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  countryCode: string;
  departmentId: number;
  departmentName: string;
  jobTitle: string;
  level: Level;
  status: EmployeeStatus;
  hireDate: Date;
  salaryMinor: number;
  currency: string;
}

export interface EmployeeRepository {
  findMany(query: CleanEmployeeListQuery): Promise<EmployeeListRow[]>;
  count(query: CleanEmployeeListQuery): Promise<number>;
}

export interface EmployeeListResult {
  items: EmployeeListRow[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY: EmployeeSortColumn = "full_name";
const DEFAULT_SORT_DIR = "asc";

function cleanQuery(query: RawEmployeeListQuery): CleanEmployeeListQuery {
  const clean: CleanEmployeeListQuery = {
    page: query.page ?? DEFAULT_PAGE,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
    sortBy: query.sortBy ?? DEFAULT_SORT_BY,
    sortDir: query.sortDir ?? DEFAULT_SORT_DIR,
  };

  if (query.search !== undefined) clean.search = query.search;
  if (query.countryCode !== undefined) clean.countryCode = query.countryCode;
  if (query.departmentId !== undefined) clean.departmentId = query.departmentId;
  if (query.level !== undefined) clean.level = query.level;
  if (query.status !== undefined) clean.status = query.status;

  return clean;
}

export async function listEmployees(
  repo: EmployeeRepository,
  query: RawEmployeeListQuery,
): Promise<EmployeeListResult> {
  const clean = cleanQuery(query);

  const [items, total] = await Promise.all([repo.findMany(clean), repo.count(clean)]);

  return { items, total, page: clean.page, pageSize: clean.pageSize };
}
