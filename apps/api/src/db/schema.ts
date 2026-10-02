import {
  bigint,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const levelEnum = pgEnum("level", ["L1", "L2", "L3", "L4", "L5", "L6"]);
export const employeeStatusEnum = pgEnum("employee_status", ["active", "inactive"]);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    employeeCode: text("employee_code").notNull().unique(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    departmentId: integer("department_id").notNull().references(() => departments.id),
    jobTitle: text("job_title").notNull(),
    level: levelEnum("level").notNull(),
    status: employeeStatusEnum("status").notNull(),
    hireDate: timestamp("hire_date", { mode: "date" }).notNull(),
    salaryMinor: bigint("salary_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_employees_country_code").on(table.countryCode),
    index("idx_employees_department_id").on(table.departmentId),
    index("idx_employees_level").on(table.level),
    index("idx_employees_status").on(table.status),
  ],
);

export const salaryChanges = pgTable(
  "salary_changes",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
    previousAmountMinor: bigint("previous_amount_minor", { mode: "number" }),
    newAmountMinor: bigint("new_amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    effectiveDate: timestamp("effective_date", { mode: "date" }).notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_salary_changes_employee_effective").on(table.employeeId, table.effectiveDate)],
);

export const exchangeRates = pgTable("exchange_rates", {
  currency: varchar("currency", { length: 3 }).primaryKey(),
  rateToUsd: numeric("rate_to_usd", { precision: 12, scale: 6 }).notNull(),
});

export const payBands = pgTable(
  "pay_bands",
  {
    level: levelEnum("level").notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    minMinor: bigint("min_minor", { mode: "number" }).notNull(),
    maxMinor: bigint("max_minor", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.level, table.countryCode] })],
);
