import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/testDb";
import { departments, employees } from "../db/schema";
import type { Db } from "../db/types";
import { createSalaryChangeRepository } from "./salaryChanges";

describe("createSalaryChangeRepository", () => {
  it("rolls back the employee salary_minor when the salary_changes insert fails", async () => {
    const db: Db = await createTestDb();

    const [department] = await db
      .insert(departments)
      .values({ name: "Engineering" })
      .returning({ id: departments.id });

    const [employee] = await db
      .insert(employees)
      .values({
        employeeCode: "EMP000001",
        fullName: "Ada Lovelace",
        email: "ada.lovelace@acme.example",
        countryCode: "GB",
        departmentId: department.id,
        jobTitle: "Software Engineer",
        level: "L3",
        status: "active",
        hireDate: new Date("2021-05-01"),
        salaryMinor: 9_000_000,
        currency: "GBP",
      })
      .returning({ id: employees.id, salaryMinor: employees.salaryMinor });

    const repo = createSalaryChangeRepository(db);

    await expect(
      repo.record(employee.id, {
        previousAmountMinor: employee.salaryMinor,
        newAmountMinor: 9_500_000,
        // Exceeds salary_changes.currency's varchar(3) — forces the insert to
        // fail *after* the employees update has already run in the same
        // transaction, which is exactly what this test needs to prove rollback.
        currency: "TOOLONG",
        effectiveDate: new Date("2026-01-10"),
        reason: "Annual review",
      }),
    ).rejects.toThrow();

    const [row] = await db
      .select({ salaryMinor: employees.salaryMinor })
      .from(employees)
      .where(eq(employees.id, employee.id));

    expect(row.salaryMinor).toBe(employee.salaryMinor);
  });
});
