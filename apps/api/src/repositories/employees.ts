import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { departments, employees } from "../db/schema";
import type { Db } from "../db/types";
import type {
  CleanEmployeeListQuery,
  EmployeeListRow,
  EmployeeRepository,
} from "../services/employees";

const SORT_COLUMNS = {
  full_name: employees.fullName,
  employee_code: employees.employeeCode,
  country_code: employees.countryCode,
  level: employees.level,
  status: employees.status,
  hire_date: employees.hireDate,
  salary_minor: employees.salaryMinor,
} as const;

function buildWhere(query: CleanEmployeeListQuery): SQL | undefined {
  const conditions: SQL[] = [];

  if (query.search) {
    const pattern = `%${query.search}%`;
    const searchCondition = or(
      ilike(employees.fullName, pattern),
      ilike(employees.email, pattern),
      ilike(employees.employeeCode, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  if (query.countryCode) conditions.push(eq(employees.countryCode, query.countryCode));
  if (query.departmentId) conditions.push(eq(employees.departmentId, query.departmentId));
  if (query.level) conditions.push(eq(employees.level, query.level));
  if (query.status) conditions.push(eq(employees.status, query.status));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const SELECTED_COLUMNS = {
  id: employees.id,
  employeeCode: employees.employeeCode,
  fullName: employees.fullName,
  email: employees.email,
  countryCode: employees.countryCode,
  departmentId: employees.departmentId,
  departmentName: departments.name,
  jobTitle: employees.jobTitle,
  level: employees.level,
  status: employees.status,
  hireDate: employees.hireDate,
  salaryMinor: employees.salaryMinor,
  currency: employees.currency,
};

export function createEmployeeRepository(db: Db): EmployeeRepository {
  return {
    async findMany(query: CleanEmployeeListQuery): Promise<EmployeeListRow[]> {
      const where = buildWhere(query);
      const orderFn = query.sortDir === "desc" ? desc : asc;

      return db
        .select(SELECTED_COLUMNS)
        .from(employees)
        .innerJoin(departments, eq(employees.departmentId, departments.id))
        .where(where)
        .orderBy(orderFn(SORT_COLUMNS[query.sortBy]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize);
    },

    async count(query: CleanEmployeeListQuery): Promise<number> {
      const where = buildWhere(query);

      const [row] = await db
        .select({ value: count() })
        .from(employees)
        .innerJoin(departments, eq(employees.departmentId, departments.id))
        .where(where);

      return row?.value ?? 0;
    },
  };
}
