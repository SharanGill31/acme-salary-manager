import { and, asc, count, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import type { CreateEmployeeInput, Level, UpdateEmployeeInput } from "shared";
import { departments, employees, payBands, salaryChanges } from "../db/schema";
import type { Db } from "../db/types";
import type {
  CleanEmployeeExportQuery,
  CleanEmployeeListQuery,
  EmployeeListRow,
  EmployeeRepository,
  PayBandRow,
  SalaryChangeRow,
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

// Many employees tie on the sort column (country, level, status...), and
// Postgres doesn't guarantee an order among ties, so pages could repeat or
// skip rows. id breaks the tie, always ascending.
function buildOrderBy(query: CleanEmployeeExportQuery): SQL[] {
  const orderFn = query.sortDir === "desc" ? desc : asc;
  return [orderFn(SORT_COLUMNS[query.sortBy]), asc(employees.id)];
}

function buildWhere(query: CleanEmployeeExportQuery): SQL | undefined {
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

export async function selectEmployeeRowById(
  db: Db,
  id: number,
): Promise<EmployeeListRow | undefined> {
  const [row] = await db
    .select(SELECTED_COLUMNS)
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, id));

  return row;
}

export function createEmployeeRepository(db: Db): EmployeeRepository {
  return {
    async findMany(query: CleanEmployeeListQuery): Promise<EmployeeListRow[]> {
      return db
        .select(SELECTED_COLUMNS)
        .from(employees)
        .innerJoin(departments, eq(employees.departmentId, departments.id))
        .where(buildWhere(query))
        .orderBy(...buildOrderBy(query))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize);
    },

    // Same selection and order as findMany, without paging (for the export).
    async findAll(query: CleanEmployeeExportQuery): Promise<EmployeeListRow[]> {
      return db
        .select(SELECTED_COLUMNS)
        .from(employees)
        .innerJoin(departments, eq(employees.departmentId, departments.id))
        .where(buildWhere(query))
        .orderBy(...buildOrderBy(query));
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

    async findById(id: number): Promise<EmployeeListRow | undefined> {
      return selectEmployeeRowById(db, id);
    },

    async findSalaryHistory(employeeId: number): Promise<SalaryChangeRow[]> {
      return db
        .select({
          id: salaryChanges.id,
          previousAmountMinor: salaryChanges.previousAmountMinor,
          newAmountMinor: salaryChanges.newAmountMinor,
          currency: salaryChanges.currency,
          effectiveDate: salaryChanges.effectiveDate,
          reason: salaryChanges.reason,
          createdAt: salaryChanges.createdAt,
        })
        .from(salaryChanges)
        .where(eq(salaryChanges.employeeId, employeeId))
        .orderBy(desc(salaryChanges.effectiveDate), desc(salaryChanges.id));
    },

    async findPayBand(level: Level, countryCode: string): Promise<PayBandRow | undefined> {
      const [row] = await db
        .select({
          level: payBands.level,
          countryCode: payBands.countryCode,
          minMinor: payBands.minMinor,
          maxMinor: payBands.maxMinor,
        })
        .from(payBands)
        .where(and(eq(payBands.level, level), eq(payBands.countryCode, countryCode)));

      return row;
    },

    async emailExists(email: string, excludeId?: number): Promise<boolean> {
      const conditions = [eq(employees.email, email)];
      if (excludeId !== undefined) conditions.push(ne(employees.id, excludeId));

      const [row] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(...conditions))
        .limit(1);

      return row !== undefined;
    },

    async employeeCodeExists(employeeCode: string): Promise<boolean> {
      const [row] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.employeeCode, employeeCode))
        .limit(1);

      return row !== undefined;
    },

    async create(input: CreateEmployeeInput): Promise<EmployeeListRow> {
      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(employees)
          .values({
            employeeCode: input.employee_code,
            fullName: input.full_name,
            email: input.email,
            countryCode: input.country_code,
            departmentId: input.department_id,
            jobTitle: input.job_title,
            level: input.level,
            status: input.status,
            hireDate: input.hire_date,
            salaryMinor: input.salary_minor,
            currency: input.currency,
          })
          .returning({ id: employees.id });

        await tx.insert(salaryChanges).values({
          employeeId: created.id,
          previousAmountMinor: null,
          newAmountMinor: input.salary_minor,
          currency: input.currency,
          effectiveDate: input.hire_date,
          reason: "Hire",
        });

        const row = await selectEmployeeRowById(tx as Db, created.id);
        if (!row) throw new Error("Failed to load the employee that was just created");
        return row;
      });
    },

    async update(id: number, patch: UpdateEmployeeInput): Promise<EmployeeListRow> {
      const values: Record<string, unknown> = { updatedAt: new Date() };

      if (patch.full_name !== undefined) values.fullName = patch.full_name;
      if (patch.email !== undefined) values.email = patch.email;
      if (patch.department_id !== undefined) values.departmentId = patch.department_id;
      if (patch.job_title !== undefined) values.jobTitle = patch.job_title;
      if (patch.level !== undefined) values.level = patch.level;
      if (patch.status !== undefined) values.status = patch.status;

      await db.update(employees).set(values).where(eq(employees.id, id));

      const row = await selectEmployeeRowById(db, id);
      if (!row) throw new Error(`Employee ${id} disappeared during update`);
      return row;
    },
  };
}
