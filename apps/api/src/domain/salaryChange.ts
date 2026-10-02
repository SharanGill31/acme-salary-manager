export interface SalaryChangeInput {
  currentAmountMinor: bigint;
  newAmountMinor: bigint;
  currency: string;
  employeeCurrency: string;
  hireDate: Date;
  effectiveDate: Date;
  reason: string;
  today: Date;
}

export type SalaryChangeValidation =
  | { ok: true; warnings: string[] }
  | { ok: false; errors: Record<string, string> };

const WARNING_THRESHOLD_PERCENT = 50;
const MAX_MONTHS_AHEAD = 12;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

export function validateSalaryChange(input: SalaryChangeInput): SalaryChangeValidation {
  const errors: Record<string, string> = {};

  if (input.newAmountMinor <= 0n) {
    errors.newAmountMinor = "newAmountMinor must be a positive amount";
  } else if (input.newAmountMinor === input.currentAmountMinor) {
    errors.newAmountMinor = "newAmountMinor must differ from the current amount";
  }

  if (input.currency !== input.employeeCurrency) {
    errors.currency = `currency must match the employee's currency (${input.employeeCurrency})`;
  }

  if (input.effectiveDate.getTime() < input.hireDate.getTime()) {
    errors.effectiveDate = "effectiveDate must not be before the hire date";
  } else if (input.effectiveDate.getTime() > addMonths(input.today, MAX_MONTHS_AHEAD).getTime()) {
    errors.effectiveDate = `effectiveDate must not be more than ${MAX_MONTHS_AHEAD} months after today`;
  }

  if (input.reason.trim().length < 3) {
    errors.reason = "reason must be at least 3 characters";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const warnings: string[] = [];
  const changePercent = Math.abs(
    (Number(input.newAmountMinor - input.currentAmountMinor) * 100) /
      Number(input.currentAmountMinor),
  );

  if (changePercent > WARNING_THRESHOLD_PERCENT) {
    warnings.push(
      `This change is more than ${WARNING_THRESHOLD_PERCENT} percent different from the current amount`,
    );
  }

  return { ok: true, warnings };
}
