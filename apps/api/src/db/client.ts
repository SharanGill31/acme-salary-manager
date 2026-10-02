import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Scripts in this workspace run with apps/api as cwd, so the default
// dotenv/config lookup misses the monorepo-root .env; point at it explicitly.
dotenv.config({ path: path.resolve(__dirname, "../../../..", ".env") });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon's serverless endpoints present a cert chain that Node's default CA
  // bundle doesn't always validate; relaxing this matches Neon's own setup docs.
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
