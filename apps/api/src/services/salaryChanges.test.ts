import { describe, expect, it, vi } from "vitest";
import type { Clock } from "../clock";
import { NotFoundError, ValidationError } from "../middleware/errorHandler";
import type { EmployeeListRow, EmployeeRepository, PayBandRow } from "./employees";
import {
  recordSalaryChange,
  type RecordSalaryChangeInput,
  type SalaryChangeRepository,
} from "./salaryChanges";

const SAMPLE_EMPLOYEE: EmployeeListRow = {
  id: 1,
  employeeCode: "EMP000001",
  fullName: "Ada Lovelace",
  email: "ada.lovelace@acme.example",
  countryCode: "GB",
  departmentId: 1,
  departmentName: "Engineering",
  jobTitle: "Software Engineer",
  level: "L3",
  status: "active",
  hireDate: new Date("2021-05-01"),
  salaryMinor: 9_000_000,
  currency: "GBP",
};

const SAMPLE_PAY_BAND: PayBandRow = {
  level: "L3",
  countryCode: "GB",
  minMinor: 7_000_000,
  maxMinor: 10_000_000,
};

const FIXED_TODAY = new Date("2026-01-15");
const fakeClock: Clock = { today: () => FIXED_TODAY };

const VALID_INPUT: RecordSalaryChangeInput = {
  employeeId: 1,
  newAmountMinor: 9_500_000,
  currency: "GBP",
  effectiveDate: new Date("2026-01-10"),
  reason: "Annual review",
};

function createFakeEmployeeRepo(overrides: Partial<EmployeeRepository> = {}): EmployeeRepository {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(undefined),
    findSalaryHistory: vi.fn().mockResolvedValue([]),
    findPayBand: vi.fn().mockResolvedValue(undefined),
    emailExists: vi.fn().mockResolvedValue(false),
    employeeCodeExists: vi.fn().mockResolvedValue(false),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
}

function createFakeSalaryChangeRepo(
  overrides: Partial<SalaryChangeRepository> = {},
): SalaryChangeRepository {
  return {
    record: vi.fn().mockResolvedValue(SAMPLE_EMPLOYEE),
    ...overrides,
  };
}

async function expectValidationError(
  employee: EmployeeListRow,
  input: RecordSalaryChangeInput,
  field: string,
  pattern: RegExp,
) {
  const employeesRepo = createFakeEmployeeRepo({ findById: vi.fn().mockResolvedValue(employee) });
  const salaryChangesRepo = createFakeSalaryChangeRepo();

  const promise = recordSalaryChange(
    { employees: employeesRepo, salaryChanges: salaryChangesRepo },
    fakeClock,
    input,
  );

  await expect(promise).rejects.toThrow(ValidationError);
  await expect(promise).rejects.toMatchObject({
    errors: { [field]: expect.stringMatching(pattern) },
  });
  expect(salaryChangesRepo.record).not.toHaveBeenCalled();
}

describe("recordSalaryChange", () => {
  it("throws NotFoundError when the employee does not exist", async () => {
    const employeesRepo = createFakeEmployeeRepo({ findById: vi.fn().mockResolvedValue(undefined) });
    const salaryChangesRepo = createFakeSalaryChangeRepo();

    await expect(
      recordSalaryChange(
        { employees: employeesRepo, salaryChanges: salaryChangesRepo },
        fakeClock,
        VALID_INPUT,
      ),
    ).rejects.toThrow(NotFoundError);

    expect(salaryChangesRepo.record).not.toHaveBeenCalled();
  });

  it("throws ValidationError when newAmountMinor is not positive", async () => {
    await expectValidationError(
      SAMPLE_EMPLOYEE,
      { ...VALID_INPUT, newAmountMinor: 0 },
      "newAmountMinor",
      /positive/i,
    );
  });

  it("throws ValidationError when newAmountMinor equals the current amount", async () => {
    await expectValidationError(
      SAMPLE_EMPLOYEE,
      { ...VALID_INPUT, newAmountMinor: SAMPLE_EMPLOYEE.salaryMinor },
      "newAmountMinor",
      /differ/i,
    );
  });

  it("throws ValidationError when the currency does not match the employee's currency", async () => {
    await expectValidationError(
      SAMPLE_EMPLOYEE,
      { ...VALID_INPUT, currency: "USD" },
      "currency",
      /currency/i,
    );
  });

  it("throws ValidationError when effectiveDate is before the hire date", async () => {
    await expectValidationError(
      SAMPLE_EMPLOYEE,
      { ...VALID_INPUT, effectiveDate: new Date("2020-01-01") },
      "effectiveDate",
      /hire date/i,
    );
  });

  it("throws ValidationError when effectiveDate is more than 12 months after today", async () => {
    await expectValidationError(
      SAMPLE_EMPLOYEE,
      { ...VALID_INPUT, effectiveDate: new Date("2027-06-01") },
      "effectiveDate",
      /12 months/i,
    );
  });

  it("throws ValidationError when reason is shorter than three characters", async () => {
    await expectValidationError(SAMPLE_EMPLOYEE, { ...VALID_INPUT, reason: "ok" }, "reason", /3/);
  });

  it("records the change, updates the salary, and returns the employee detail with no warnings", async () => {
    const updatedRow = { ...SAMPLE_EMPLOYEE, salaryMinor: 9_500_000 };
    const findById = vi.fn().mockResolvedValueOnce(SAMPLE_EMPLOYEE).mockResolvedValueOnce(updatedRow);
    const employeesRepo = createFakeEmployeeRepo({
      findById,
      findSalaryHistory: vi.fn().mockResolvedValue([]),
      findPayBand: vi.fn().mockResolvedValue(SAMPLE_PAY_BAND),
    });
    const record = vi.fn().mockResolvedValue(updatedRow);
    const salaryChangesRepo = createFakeSalaryChangeRepo({ record });

    const result = await recordSalaryChange(
      { employees: employeesRepo, salaryChanges: salaryChangesRepo },
      fakeClock,
      VALID_INPUT,
    );

    expect(record).toHaveBeenCalledWith(1, {
      previousAmountMinor: 9_000_000,
      newAmountMinor: 9_500_000,
      currency: "GBP",
      effectiveDate: VALID_INPUT.effectiveDate,
      reason: "Annual review",
    });
    expect(result.employee).toEqual(updatedRow);
    expect(result.salaryHistory).toEqual([]);
    expect(result.bandPosition).toBe("within");
    expect(result.compaRatio).toBe(1.12);
    expect(result.warnings).toEqual([]);
  });

  it("passes through warnings from the domain when the change is large", async () => {
    const updatedRow = { ...SAMPLE_EMPLOYEE, salaryMinor: 15_000_000 };
    const findById = vi.fn().mockResolvedValueOnce(SAMPLE_EMPLOYEE).mockResolvedValueOnce(updatedRow);
    const employeesRepo = createFakeEmployeeRepo({
      findById,
      findSalaryHistory: vi.fn().mockResolvedValue([]),
      findPayBand: vi.fn().mockResolvedValue(SAMPLE_PAY_BAND),
    });
    const salaryChangesRepo = createFakeSalaryChangeRepo({
      record: vi.fn().mockResolvedValue(updatedRow),
    });

    const result = await recordSalaryChange(
      { employees: employeesRepo, salaryChanges: salaryChangesRepo },
      fakeClock,
      { ...VALID_INPUT, newAmountMinor: 15_000_000 },
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/50/);
  });
});
