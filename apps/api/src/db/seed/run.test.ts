import { describe, expect, it } from "vitest";
import { createTestDb } from "../testDb";
import { seedDatabase } from "./run";

describe("seedDatabase", () => {
  it(
    "seeds deterministic row counts and is repeatable",
    async () => {
      const db = await createTestDb();

      const first = await seedDatabase(db, { seed: 42, count: 50 });
      const second = await seedDatabase(db, { seed: 42, count: 50 });

      expect(second).toEqual(first);
      expect(first.departments).toBe(10);
      expect(first.employees).toBe(50);
      expect(first.exchangeRates).toBe(8);
      expect(first.payBands).toBe(48);
      expect(first.salaryChanges).toBeGreaterThanOrEqual(50);
      expect(first.salaryChanges).toBeLessThanOrEqual(200);
    },
    15_000,
  );
});
