import type {
  CreateEmployeeInput,
  EmployeeSortColumn,
  EmployeeStatus,
  Level,
  UpdateEmployeeInput,
} from "shared";
import type { Clock } from "../clock";
import { buildEmployeesCsv } from "../domain/employeesCsv";
import { validateNewEmployee } from "../domain/newEmployee";
import { classifyAgainstBand, compaRatio as computeCompaRatio } from "../domain/payBand";
import { ConflictError, NotFoundError, ValidationError } from "../middleware/errorHandler";

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

// The list query without paging: what the CSV export selects.
export type CleanEmployeeExportQuery = Omit<CleanEmployeeListQuery, "page" | "pageSize">;

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
  findAll(query: CleanEmployeeExportQuery): Promise<EmployeeListRow[]>;
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

// Filters and sort with defaults applied; shared by the list and the export
// so both select exactly the same employees in the same order.
function cleanFilterQuery(
  query: Omit<RawEmployeeListQuery, "page" | "pageSize">,
): CleanEmployeeExportQuery {
  const clean: CleanEmployeeExportQuery = {
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

function cleanQuery(query: RawEmployeeListQuery): CleanEmployeeListQuery {
  return {
    page: query.page ?? DEFAULT_PAGE,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
    ...cleanFilterQuery(query),
  };
}

export async function listEmployees(
  repo: EmployeeRepository,
  query: RawEmployeeListQuery,
): Promise<EmployeeListResult> {
  const clean = cleanQuery(query);

  const [items, total] = await Promise.all([repo.findMany(clean), repo.count(clean)]);

  return { items, total, page: clean.page, pageSize: clean.pageSize };
}

export interface EmployeeExportResult {
  filename: string;
  csv: string;
}

// Every employee matching the list's search, filters and sort, as CSV. The
// filename carries today's (UTC) date from the injected clock.
export async function exportEmployees(
  repo: EmployeeRepository,
  clock: Clock,
  query: Omit<RawEmployeeListQuery, "page" | "pageSize">,
): Promise<EmployeeExportResult> {
  const rows = await repo.findAll(cleanFilterQuery(query));
  const date = clock.today().toISOString().slice(0, 10);

  return { filename: `employees-${date}.csv`, csv: buildEmployeesCsv(rows) };
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
  const validation = validateNewEmployee({
    countryCode: input.country_code,
    currency: input.currency,
  });
  if (!validation.ok) {
    throw new ValidationError(validation.errors);
  }

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
