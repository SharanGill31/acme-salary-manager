import type {
  CreateEmployeeInput,
  EmployeeSortColumn,
  EmployeeStatus,
  Level,
  UpdateEmployeeInput,
} from "shared";
import { classifyAgainstBand, compaRatio as computeCompaRatio } from "../domain/payBand";
import { ConflictError, NotFoundError } from "../middleware/errorHandler";

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

export interface SalaryChangeRow {
  id: number;
  previousAmountMinor: number | null;
  newAmountMinor: number;
  currency: string;
  effectiveDate: Date;
  reason: string;
  createdAt: Date;
}

export interface PayBandRow {
  level: Level;
  countryCode: string;
  minMinor: number;
  maxMinor: number;
}

export interface EmployeeRepository {
  findMany(query: CleanEmployeeListQuery): Promise<EmployeeListRow[]>;
  count(query: CleanEmployeeListQuery): Promise<number>;
  findById(id: number): Promise<EmployeeListRow | undefined>;
  findSalaryHistory(employeeId: number): Promise<SalaryChangeRow[]>;
  findPayBand(level: Level, countryCode: string): Promise<PayBandRow | undefined>;
  emailExists(email: string, excludeId?: number): Promise<boolean>;
  employeeCodeExists(employeeCode: string): Promise<boolean>;
  create(input: CreateEmployeeInput): Promise<EmployeeListRow>;
  update(id: number, patch: UpdateEmployeeInput): Promise<EmployeeListRow>;
}

export interface EmployeeListResult {
  items: EmployeeListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EmployeeDetailResult {
  employee: EmployeeListRow;
  salaryHistory: SalaryChangeRow[];
  payBand: PayBandRow;
  bandPosition: "below" | "within" | "above";
  compaRatio: number;
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

export async function getEmployeeDetail(
  repo: EmployeeRepository,
  id: number,
): Promise<EmployeeDetailResult> {
  const employee = await repo.findById(id);

  if (!employee) {
    throw new NotFoundError(`Employee ${id} not found`);
  }

  const [salaryHistory, payBand] = await Promise.all([
    repo.findSalaryHistory(id),
    repo.findPayBand(employee.level, employee.countryCode),
  ]);

  if (!payBand) {
    throw new Error(
      `No pay band configured for level ${employee.level} in ${employee.countryCode}`,
    );
  }

  const band = { minMinor: BigInt(payBand.minMinor), maxMinor: BigInt(payBand.maxMinor) };
  const salary = BigInt(employee.salaryMinor);

  return {
    employee,
    salaryHistory,
    payBand,
    bandPosition: classifyAgainstBand(salary, band),
    compaRatio: computeCompaRatio(salary, band),
  };
}

// Conflict messages are shown to the HR user next to the named input field.
const EMAIL_TAKEN = "An employee with this email already exists";

export async function createEmployee(
  repo: EmployeeRepository,
  input: CreateEmployeeInput,
): Promise<EmployeeListRow> {
  if (await repo.emailExists(input.email)) {
    throw new ConflictError(EMAIL_TAKEN, "email");
  }

  if (await repo.employeeCodeExists(input.employee_code)) {
    throw new ConflictError("An employee with this employee code already exists", "employee_code");
  }

  return repo.create(input);
}

export async function updateEmployee(
  repo: EmployeeRepository,
  id: number,
  patch: UpdateEmployeeInput,
): Promise<EmployeeListRow> {
  const existing = await repo.findById(id);

  if (!existing) {
    throw new NotFoundError(`Employee ${id} not found`);
  }

  if (patch.email !== undefined && (await repo.emailExists(patch.email, id))) {
    throw new ConflictError(EMAIL_TAKEN, "email");
  }

  return repo.update(id, patch);
}
