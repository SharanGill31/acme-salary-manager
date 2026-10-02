import { asc } from "drizzle-orm";
import { departments, employees } from "../db/schema";
import type { Db } from "../db/types";
import type { MetaRepository } from "../services/meta";

export function createMetaRepository(db: Db): MetaRepository {
  return {
    async findDistinctCountryCodes() {
      const rows = await db
        .selectDistinct({ countryCode: employees.countryCode })
        .from(employees)
        .orderBy(asc(employees.countryCode));

      return rows.map((row) => row.countryCode);
    },

    async findAllDepartments() {
      return db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .orderBy(asc(departments.name));
    },
  };
}
