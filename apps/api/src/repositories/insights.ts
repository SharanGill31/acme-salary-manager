import { and, asc, count, eq, gt, lt, or, sql } from "drizzle-orm";
import { departments, employees, exchangeRates, payBands } from "../db/schema";
import type { Db } from "../db/types";
import type { InsightsRepository } from "../services/insights";

// employees.salary_minor is in the employee's own currency; multiplying by
// exchange_rates.rate_to_usd (USD per 1 unit of that currency) converts it.
const USD_EXPR = sql`(${employees.salaryMinor}::numeric / 100) * ${exchangeRates.rateToUsd}`;

const OUTSIDE_BAND_CONDITION = or(
  lt(employees.salaryMinor, payBands.minMinor),
  gt(employees.salaryMinor, payBands.maxMinor),
);

export function createInsightsRepository(db: Db): InsightsRepository {
  return {
    async getSummary() {
      const [summaryRow] = await db
        .select({
          headcount: count(),
          totalPayrollUsd: sql<number>`coalesce(sum(${USD_EXPR}), 0)::float8`,
          medianSalaryUsd: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${USD_EXPR}), 0)::float8`,
        })
        .from(employees)
        .innerJoin(exchangeRates, eq(employees.currency, exchangeRates.currency))
        .where(eq(employees.status, "active"));

      const [outsideRow] = await db
        .select({ value: count() })
        .from(employees)
        .innerJoin(
          payBands,
          and(eq(employees.level, payBands.level), eq(employees.countryCode, payBands.countryCode)),
        )
        .where(and(eq(employees.status, "active"), OUTSIDE_BAND_CONDITION));

      return {
        headcount: summaryRow?.headcount ?? 0,
        totalPayrollUsd: summaryRow?.totalPayrollUsd ?? 0,
        medianSalaryUsd: summaryRow?.medianSalaryUsd ?? 0,
        employeesOutsideBand: outsideRow?.value ?? 0,
      };
    },

    async getByCountry() {
      return db
        .select({
          countryCode: employees.countryCode,
          headcount: count(),
          totalPayrollUsd: sql<number>`sum(${USD_EXPR})::float8`,
          averageSalaryUsd: sql<number>`avg(${USD_EXPR})::float8`,
          medianSalaryUsd: sql<number>`percentile_cont(0.5) within group (order by ${USD_EXPR})::float8`,
        })
        .from(employees)
        .innerJoin(exchangeRates, eq(employees.currency, exchangeRates.currency))
        .where(eq(employees.status, "active"))
        .groupBy(employees.countryCode)
        .orderBy(asc(employees.countryCode));
    },

    async getByDepartment() {
      return db
        .select({
          departmentId: employees.departmentId,
          departmentName: departments.name,
          headcount: count(),
          totalPayrollUsd: sql<number>`sum(${USD_EXPR})::float8`,
          averageSalaryUsd: sql<number>`avg(${USD_EXPR})::float8`,
          medianSalaryUsd: sql<number>`percentile_cont(0.5) within group (order by ${USD_EXPR})::float8`,
        })
        .from(employees)
        .innerJoin(exchangeRates, eq(employees.currency, exchangeRates.currency))
        .innerJoin(departments, eq(employees.departmentId, departments.id))
        .where(eq(employees.status, "active"))
        .groupBy(employees.departmentId, departments.name)
        .orderBy(asc(departments.name));
    },

    async getByLevel(countryCode) {
      if (countryCode) {
        const rows = await db
          .select({
            level: employees.level,
            minSalary: sql<number>`(min(${employees.salaryMinor}::numeric) / 100)::float8`,
            medianSalary: sql<number>`(percentile_cont(0.5) within group (order by ${employees.salaryMinor}::numeric) / 100)::float8`,
            averageSalary: sql<number>`(avg(${employees.salaryMinor}::numeric) / 100)::float8`,
            maxSalary: sql<number>`(max(${employees.salaryMinor}::numeric) / 100)::float8`,
            currency: sql<string>`min(${employees.currency})`,
          })
          .from(employees)
          .where(and(eq(employees.status, "active"), eq(employees.countryCode, countryCode)))
          .groupBy(employees.level)
          .orderBy(asc(employees.level));

        const currency = rows[0]?.currency ?? "";
        return {
          currency,
          levels: rows.map(({ currency: _currency, ...rest }) => rest),
        };
      }

      const rows = await db
        .select({
          level: employees.level,
          minSalary: sql<number>`min(${USD_EXPR})::float8`,
          medianSalary: sql<number>`percentile_cont(0.5) within group (order by ${USD_EXPR})::float8`,
          averageSalary: sql<number>`avg(${USD_EXPR})::float8`,
          maxSalary: sql<number>`max(${USD_EXPR})::float8`,
        })
        .from(employees)
        .innerJoin(exchangeRates, eq(employees.currency, exchangeRates.currency))
        .where(eq(employees.status, "active"))
        .groupBy(employees.level)
        .orderBy(asc(employees.level));

      return { currency: "USD", levels: rows };
    },

    async getOutliers(page, pageSize) {
      const where = and(eq(employees.status, "active"), OUTSIDE_BAND_CONDITION);
      const bandJoin = and(
        eq(employees.level, payBands.level),
        eq(employees.countryCode, payBands.countryCode),
      );

      const [rows, countRows] = await Promise.all([
        db
          .select({
            id: employees.id,
            employeeCode: employees.employeeCode,
            fullName: employees.fullName,
            departmentName: departments.name,
            countryCode: employees.countryCode,
            level: employees.level,
            salaryMinor: employees.salaryMinor,
            currency: employees.currency,
            bandMinMinor: payBands.minMinor,
            bandMaxMinor: payBands.maxMinor,
          })
          .from(employees)
          .innerJoin(departments, eq(employees.departmentId, departments.id))
          .innerJoin(payBands, bandJoin)
          .where(where)
          .orderBy(asc(employees.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ value: count() })
          .from(employees)
          .innerJoin(payBands, bandJoin)
          .where(where),
      ]);

      return { rows, total: countRows[0]?.value ?? 0 };
    },
  };
}
