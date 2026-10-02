import type { Clock } from "../clock";
import { validateSalaryChange } from "../domain/salaryChange";
import { NotFoundError, ValidationError } from "../middleware/errorHandler";
import {
  getEmployeeDetail,
  type EmployeeDetailResult,
  type EmployeeListRow,
  type EmployeeRepository,
} from "./employees";

export interface SalaryChangeRepository {
  record(
    employeeId: number,
    change: {
      previousAmountMinor: number;
      newAmountMinor: number;
      currency: string;
      effectiveDate: Date;
      reason: string;
    },
  ): Promise<EmployeeListRow>;
}

export interface RecordSalaryChangeInput {
  employeeId: number;
  newAmountMinor: number;
  currency: string;
  effectiveDate: Date;
  reason: string;
}

export type RecordSalaryChangeResult = EmployeeDetailResult & { warnings: string[] };

export async function recordSalaryChange(
  repos: { employees: EmployeeRepository; salaryChanges: SalaryChangeRepository },
  clock: Clock,
  input: RecordSalaryChangeInput,
): Promise<RecordSalaryChangeResult> {
  const employee = await repos.employees.findById(input.employeeId);

  if (!employee) {
    throw new NotFoundError(`Employee ${input.employeeId} not found`);
  }

  const validation = validateSalaryChange({
    currentAmountMinor: BigInt(employee.salaryMinor),
    newAmountMinor: BigInt(input.newAmountMinor),
    currency: input.currency,
    employeeCurrency: employee.currency,
    hireDate: employee.hireDate,
    effectiveDate: input.effectiveDate,
    reason: input.reason,
    today: clock.today(),
  });

  if (!validation.ok) {
    throw new ValidationError(validation.errors);
  }

  await repos.salaryChanges.record(input.employeeId, {
    previousAmountMinor: employee.salaryMinor,
    newAmountMinor: input.newAmountMinor,
    currency: input.currency,
    effectiveDate: input.effectiveDate,
    reason: input.reason,
  });

  const detail = await getEmployeeDetail(repos.employees, input.employeeId);

  return { ...detail, warnings: validation.warnings };
}
