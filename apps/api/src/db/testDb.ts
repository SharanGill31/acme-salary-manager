import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "./schema";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: path.join(__dirname, "../../drizzle") });

  return db;
}
