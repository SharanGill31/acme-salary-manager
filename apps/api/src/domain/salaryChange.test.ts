import { describe, expect, it } from "vitest";
import { validateSalaryChange } from "./salaryChange";

function baseInput() {
  return {
    currentAmountMinor: 500_000n,
    newAmountMinor: 550_000n,
    currency: "USD",
    employeeCurrency: "USD",
    hireDate: new Date("2020-01-01"),
    effectiveDate: new Date("2026-01-15"),
    reason: "Annual review",
    today: new Date("2026-01-15"),
  };
}

describe("validateSalaryChange", () => {
  it("rejects a non-positive newAmountMinor", () => {
    const zero = validateSalaryChange({ ...baseInput(), newAmountMinor: 0n });
    const negative = validateSalaryChange({ ...baseInput(), newAmountMinor: -1000n });

    expect(zero.ok).toBe(false);
    expect(negative.ok).toBe(false);
    if (!zero.ok) expect(zero.errors.newAmountMinor).toMatch(/greater than zero/i);
    if (!negative.ok) expect(negative.errors.newAmountMinor).toMatch(/greater than zero/i);
  });

  it("rejects a currency that does not match the employee's currency", () => {
    const result = validateSalaryChange({ ...baseInput(), currency: "EUR" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.currency).toBeTruthy();
  });

  it("rejects a newAmountMinor equal to the current amount", () => {
    const input = baseInput();
    const result = validateSalaryChange({ ...input, newAmountMinor: input.currentAmountMinor });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.newAmountMinor).toMatch(/differ/i);
  });

  it("rejects an effectiveDate before the hire date", () => {
    const result = validateSalaryChange({
      ...baseInput(),
      effectiveDate: new Date("2019-01-01"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.effectiveDate).toBeTruthy();
  });

  it("rejects an effectiveDate more than 12 months after today", () => {
    const result = validateSalaryChange({
      ...baseInput(),
      effectiveDate: new Date("2027-03-01"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.effectiveDate).toBeTruthy();
  });

  it("rejects a reason shorter than three characters after trimming", () => {
    const result = validateSalaryChange({ ...baseInput(), reason: "  ok  " });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.reason).toBeTruthy();
  });

  it("accepts a valid change with no warnings", () => {
    const result = validateSalaryChange(baseInput());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toEqual([]);
  });

  it("warns when the increase is more than 50 percent", () => {
    const input = baseInput();
    const result = validateSalaryChange({ ...input, newAmountMinor: 800_000n });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toMatch(/50/);
    }
  });

  it("warns when the decrease is more than 50 percent", () => {
    const input = baseInput();
    const result = validateSalaryChange({ ...input, newAmountMinor: 200_000n });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toMatch(/50/);
    }
  });

  describe("messages are written for the HR user", () => {
    function errorsFor(overrides: Partial<ReturnType<typeof baseInput>>) {
      const result = validateSalaryChange({ ...baseInput(), ...overrides });
      if (result.ok) throw new Error("expected validation to fail");
      return result.errors;
    }

    it("uses plain-language error messages", () => {
      expect(errorsFor({ newAmountMinor: 0n }).newAmountMinor).toBe(
        "New salary must be greater than zero",
      );
      expect(errorsFor({ newAmountMinor: 500_000n }).newAmountMinor).toBe(
        "New salary must be different from the current salary",
      );
      expect(errorsFor({ currency: "EUR" }).currency).toBe(
        "Currency must be the employee's currency (USD)",
      );
      expect(errorsFor({ effectiveDate: new Date("2019-01-01") }).effectiveDate).toBe(
        "Effective date can't be before the hire date",
      );
      expect(errorsFor({ effectiveDate: new Date("2027-03-01") }).effectiveDate).toBe(
        "Effective date can't be more than 12 months from today",
      );
      expect(errorsFor({ reason: "ok" }).reason).toBe("Reason must be at least 3 characters");
    });

    it("never exposes code identifiers in error messages", () => {
      const errors = errorsFor({
        newAmountMinor: 0n,
        currency: "EUR",
        effectiveDate: new Date("2019-01-01"),
        reason: "ok",
      });

      for (const message of Object.values(errors)) {
        expect(message).not.toMatch(/newAmountMinor|effectiveDate|employeeCurrency|^reason|^currency/);
      }
    });

    it("uses a plain-language large-change warning", () => {
      const result = validateSalaryChange({ ...baseInput(), newAmountMinor: 800_000n });

      expect(result.ok && result.warnings).toEqual([
        "This change is more than 50% different from the current salary",
      ]);
    });
  });
});
