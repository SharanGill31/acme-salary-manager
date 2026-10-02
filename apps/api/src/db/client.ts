import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon's serverless endpoints present a cert chain that Node's default CA
  // bundle doesn't always validate; relaxing this matches Neon's own setup docs.
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
