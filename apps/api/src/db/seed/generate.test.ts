import { describe, expect, it } from "vitest";
import { generateSeedData } from "./generate";

describe("generateSeedData", () => {
  it("is deterministic for the same seed", () => {
    const a = generateSeedData(42, 200);
    const b = generateSeedData(42, 200);

    expect(b).toEqual(a);
  });

  it("returns exactly the requested number of employees", () => {
    const data = generateSeedData(42, 321);

    expect(data.employees).toHaveLength(321);
  });

  it("gives every employee a unique employee code and email", () => {
    const data = generateSeedData(42, 2000);

    expect(new Set(data.employees.map((e) => e.employeeCode)).size).toBe(2000);
    expect(new Set(data.employees.map((e) => e.email)).size).toBe(2000);
  });

  it("only produces positive integer amounts", () => {
    const data = generateSeedData(42, 500);

    for (const band of data.payBands) {
      expect(Number.isInteger(band.minMinor)).toBe(true);
      expect(band.minMinor).toBeGreaterThan(0);
      expect(Number.isInteger(band.maxMinor)).toBe(true);
      expect(band.maxMinor).toBeGreaterThan(band.minMinor);
    }

    for (const employee of data.employees) {
      expect(Number.isInteger(employee.salaryMinor)).toBe(true);
      expect(employee.salaryMinor).toBeGreaterThan(0);
    }

    for (const change of data.salaryChanges) {
      expect(Number.isInteger(change.newAmountMinor)).toBe(true);
      expect(change.newAmountMinor).toBeGreaterThan(0);

      if (change.previousAmountMinor !== null) {
        expect(Number.isInteger(change.previousAmountMinor)).toBe(true);
        expect(change.previousAmountMinor).toBeGreaterThan(0);
      }
    }
  });

  it("ends each employee's salary history at their current salary", () => {
    const data = generateSeedData(42, 800);
    const changesByEmployee = new Map<number, typeof data.salaryChanges>();

    for (const change of data.salaryChanges) {
      const list = changesByEmployee.get(change.employeeIndex) ?? [];
      list.push(change);
      changesByEmployee.set(change.employeeIndex, list);
    }

    data.employees.forEach((employee, index) => {
      const history = changesByEmployee.get(index) ?? [];

      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history.length).toBeLessThanOrEqual(4);

      const sorted = [...history].sort(
        (a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime(),
      );

      expect(sorted[sorted.length - 1].newAmountMinor).toBe(employee.salaryMinor);
    });
  });

  it("places roughly 3 percent of salaries outside their pay band", () => {
    const data = generateSeedData(42, 10_000);
    const bandByKey = new Map(data.payBands.map((b) => [`${b.level}:${b.countryCode}`, b]));

    const outside = data.employees.filter((employee) => {
      const band = bandByKey.get(`${employee.level}:${employee.countryCode}`)!;
      return employee.salaryMinor < band.minMinor || employee.salaryMinor > band.maxMinor;
    });

    const fraction = outside.length / data.employees.length;

    expect(fraction).toBeGreaterThan(0.01);
    expect(fraction).toBeLessThan(0.06);
  });
});
