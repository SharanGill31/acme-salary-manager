import { and, asc, count, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";
import { departments, employees, exchangeRates, payBands } from "../db/schema";
import type { Db } from "../db/types";
import type { InsightsRepository } from "../services/insights";

// Money stays exact integer minor units end to end: all arithmetic is in
// Postgres `numeric` and every result is rounded to a whole minor unit and
// returned as text (never float8).
//
// employees.salary_minor is in the employee's own currency; multiplying by
// exchange_rates.rate_to_usd (USD per 1 unit of that currency) gives USD
// minor units. That holds because every currency Acme pays in has 2 minor
// digits, like USD (see COUNTRY_CURRENCIES). Each employee's USD salary is
// rounded to a whole cent before aggregating.
const USD_MINOR = sql`round(${employees.salaryMinor}::numeric * ${exchangeRates.rateToUsd})`;
const LOCAL_MINOR = sql`${employees.salaryMinor}::numeric`;

function sumMinor(expr: SQL) {
  return sql<string>`coalesce(sum(${expr}), 0)::bigint::text`;
}

function avgMinor(expr: SQL) {
  return sql<string>`round(avg(${expr}))::bigint::text`;
}

function minMinor(expr: SQL) {
  return sql<string>`min(${expr})::bigint::text`;
}

function maxMinor(expr: SQL) {
  return sql<string>`max(${expr})::bigint::text`;
}

// percentile_cont works in double precision; the inputs are whole minor
// units far below 2^53, so it is exact, and its result (a whole number or a
// half) is rounded half away from zero as numeric.
function medianMinor(expr: SQL) {
  return sql<string>`round((percentile_cont(0.5) within group (order by ${expr}))::numeric)::bigint::text`;
}

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
          totalPayrollUsdMinor: sumMinor(USD_MINOR),
          medianSalaryUsdMinor: medianMinor(USD_MINOR),
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

      // With no active employees the median is NULL, reported as zero.
      return {
        headcount: summaryRow?.headcount ?? 0,
        totalPayrollUsdMinor: summaryRow?.totalPayrollUsdMinor ?? "0",
        medianSalaryUsdMinor: summaryRow?.medianSalaryUsdMinor ?? "0",
        employeesOutsideBand: outsideRow?.value ?? 0,
      };
    },

    async getByCountry() {
      return db
        .select({
          countryCode: employees.countryCode,
          headcount: count(),
          totalPayrollUsdMinor: sumMinor(USD_MINOR),
          averageSalaryUsdMinor: avgMinor(USD_MINOR),
          medianSalaryUsdMinor: medianMinor(USD_MINOR),
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
          totalPayrollUsdMinor: sumMinor(USD_MINOR),
          averageSalaryUsdMinor: avgMinor(USD_MINOR),
          medianSalaryUsdMinor: medianMinor(USD_MINOR),
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
            minSalaryMinor: minMinor(LOCAL_MINOR),
            medianSalaryMinor: medianMinor(LOCAL_MINOR),
            averageSalaryMinor: avgMinor(LOCAL_MINOR),
            maxSalaryMinor: maxMinor(LOCAL_MINOR),
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
          minSalaryMinor: minMinor(USD_MINOR),
          medianSalaryMinor: medianMinor(USD_MINOR),
          averageSalaryMinor: avgMinor(USD_MINOR),
          maxSalaryMinor: maxMinor(USD_MINOR),
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
