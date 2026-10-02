import { eq } from "drizzle-orm";
import { employees, salaryChanges } from "../db/schema";
import type { Db } from "../db/types";
import type { EmployeeListRow } from "../services/employees";
import type { SalaryChangeRepository } from "../services/salaryChanges";
import { selectEmployeeRowById } from "./employees";

export function createSalaryChangeRepository(db: Db): SalaryChangeRepository {
  return {
    async record(
      employeeId: number,
      change: {
        previousAmountMinor: number;
        newAmountMinor: number;
        currency: string;
        effectiveDate: Date;
        reason: string;
      },
    ): Promise<EmployeeListRow> {
      return db.transaction(async (tx) => {
        // Update first, insert second: if the insert fails, this update must
        // roll back too — that ordering is what repositories/salaryChanges.test.ts
        // exercises to prove the transaction is atomic.
        await tx
          .update(employees)
          .set({ salaryMinor: change.newAmountMinor, updatedAt: new Date() })
          .where(eq(employees.id, employeeId));

        await tx.insert(salaryChanges).values({
          employeeId,
          previousAmountMinor: change.previousAmountMinor,
          newAmountMinor: change.newAmountMinor,
          currency: change.currency,
          effectiveDate: change.effectiveDate,
          reason: change.reason,
        });

        const row = await selectEmployeeRowById(tx as Db, employeeId);
        if (!row) throw new Error(`Employee ${employeeId} disappeared during salary change`);
        return row;
      });
    },
  };
}
