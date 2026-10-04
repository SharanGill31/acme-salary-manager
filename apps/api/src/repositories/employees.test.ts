import { beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { createTestDb } from "../db/testDb";
import { departments, employees } from "../db/schema";
import type { Db } from "../db/types";
import type { CleanEmployeeListQuery } from "../services/employees";
import { createEmployeeRepository } from "./employees";

describe("createEmployeeRepository", () => {
  describe("findMany sort stability", () => {
    let db: Db;
    let ids: number[];

    beforeAll(async () => {
      db = await createTestDb();

      const [department] = await db
        .insert(departments)
        .values({ name: "Engineering" })
        .returning({ id: departments.id });

      // Twelve employees who tie on every sortable column except name, code
      // and email.
      const inserted = await db
        .insert(employees)
        .values(
          Array.from({ length: 12 }, (_, index) => ({
            employeeCode: `EMP${String(index + 1).padStart(6, "0")}`,
            fullName: `Person ${index + 1}`,
            email: `person${index + 1}@acme.example`,
            countryCode: "GB",
            departmentId: department.id,
            jobTitle: "Engineer",
            level: "L3" as const,
            status: "active" as const,
            hireDate: new Date("2021-05-01"),
            salaryMinor: 9_000_000,
            currency: "GBP",
          })),
        )
        .returning({ id: employees.id });
      ids = inserted.map((row) => row.id).sort((a, b) => a - b);

      // An UPDATE writes a new row version at the end of the table, so the
      // physical order no longer matches id order. Without a tiebreak, rows
      // that tie on the sort column come back in that physical order.
      await db
        .update(employees)
        .set({ jobTitle: "Senior Engineer" })
        .where(inArray(employees.id, ids.slice(0, 4)));
    });

    async function allPages(sortDir: "asc" | "desc"): Promise<number[]> {
      const repo = createEmployeeRepository(db);
      const seen: number[] = [];
      for (const page of [1, 2, 3]) {
        const query: CleanEmployeeListQuery = { sortBy: "country_code", sortDir, page, pageSize: 5 };
        const rows = await repo.findMany(query);
        seen.push(...rows.map((row) => row.id));
      }
      return seen;
    }

    it("breaks ties by id so paging returns every employee exactly once, in a stable order", async () => {
      expect(await allPages("asc")).toEqual(ids);
    });

    it("keeps the id tiebreak ascending when the sort column is descending", async () => {
      expect(await allPages("desc")).toEqual(ids);
    });
  });
});
