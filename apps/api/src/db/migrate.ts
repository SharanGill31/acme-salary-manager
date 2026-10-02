import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Scripts in this workspace run with apps/api as cwd, so the default
// dotenv/config lookup misses the monorepo-root .env; point at it explicitly.
dotenv.config({ path: path.resolve(__dirname, "../../../..", ".env") });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: path.join(__dirname, "../../drizzle") });

  await pool.end();
}

main();
