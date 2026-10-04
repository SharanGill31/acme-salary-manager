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
    errors.newAmountMinor = "New salary must be greater than zero";
  } else if (input.newAmountMinor === input.currentAmountMinor) {
    errors.newAmountMinor = "New salary must be different from the current salary";
  }

  if (input.currency !== input.employeeCurrency) {
    errors.currency = `Currency must be the employee's currency (${input.employeeCurrency})`;
  }

  if (input.effectiveDate.getTime() < input.hireDate.getTime()) {
    errors.effectiveDate = "Effective date can't be before the hire date";
  } else if (input.effectiveDate.getTime() > addMonths(input.today, MAX_MONTHS_AHEAD).getTime()) {
    errors.effectiveDate = `Effective date can't be more than ${MAX_MONTHS_AHEAD} months from today`;
  }

  if (input.reason.trim().length < 3) {
    errors.reason = "Reason must be at least 3 characters";
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
      `This change is more than ${WARNING_THRESHOLD_PERCENT}% different from the current salary`,
    );
  }

  return { ok: true, warnings };
}
