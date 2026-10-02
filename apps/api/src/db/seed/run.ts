import { sql } from "drizzle-orm";
import type { Db } from "../types";
import { departments, employees, exchangeRates, payBands, salaryChanges } from "../schema";
import { generateSeedData } from "./generate";

const BATCH_SIZE = 1000;

export interface SeedSummary {
  departments: number;
  employees: number;
  exchangeRates: number;
  payBands: number;
  salaryChanges: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export async function seedDatabase(
  db: Db,
  { seed, count }: { seed: number; count: number },
): Promise<SeedSummary> {
  const data = generateSeedData(seed, count);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE TABLE ${salaryChanges}, ${employees}, ${departments}, ${exchangeRates}, ${payBands} RESTART IDENTITY CASCADE`,
    );

    for (const batch of chunk(data.exchangeRates, BATCH_SIZE)) {
      await tx.insert(exchangeRates).values(batch);
    }

    for (const batch of chunk(data.payBands, BATCH_SIZE)) {
      await tx.insert(payBands).values(batch);
    }

    const departmentIds: number[] = [];
    for (const batch of chunk(data.departments, BATCH_SIZE)) {
      const inserted = await tx.insert(departments).values(batch).returning({ id: departments.id });
      departmentIds.push(...inserted.map((row) => row.id));
    }

    const employeeIds: number[] = [];
    for (const batch of chunk(data.employees, BATCH_SIZE)) {
      const rows = batch.map(({ departmentIndex, ...employee }) => ({
        ...employee,
        departmentId: departmentIds[departmentIndex],
      }));
      const inserted = await tx.insert(employees).values(rows).returning({ id: employees.id });
      employeeIds.push(...inserted.map((row) => row.id));
    }

    for (const batch of chunk(data.salaryChanges, BATCH_SIZE)) {
      const rows = batch.map(({ employeeIndex, ...change }) => ({
        ...change,
        employeeId: employeeIds[employeeIndex],
      }));
      await tx.insert(salaryChanges).values(rows);
    }

    return {
      departments: departmentIds.length,
      employees: employeeIds.length,
      exchangeRates: data.exchangeRates.length,
      payBands: data.payBands.length,
      salaryChanges: data.salaryChanges.length,
    };
  });
}
