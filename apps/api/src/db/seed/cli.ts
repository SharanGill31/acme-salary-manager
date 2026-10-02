import path from "node:path";
import dotenv from "dotenv";
import { db, pool } from "../client";
import { seedDatabase } from "./run";

// Scripts in this workspace run with apps/api as cwd, so the default
// dotenv/config lookup misses the monorepo-root .env; point at it explicitly.
dotenv.config({ path: path.resolve(__dirname, "../../../../..", ".env") });

const DEFAULT_SEED = 42;
const DEFAULT_COUNT = 10_000;

async function main() {
  const seed = Number(process.argv[2] ?? DEFAULT_SEED);
  const count = Number(process.argv[3] ?? DEFAULT_COUNT);

  const startedAt = Date.now();
  const summary = await seedDatabase(db, { seed, count });
  const elapsedMs = Date.now() - startedAt;

  console.log(`departments:    ${summary.departments}`);
  console.log(`employees:      ${summary.employees}`);
  console.log(`exchangeRates:  ${summary.exchangeRates}`);
  console.log(`payBands:       ${summary.payBands}`);
  console.log(`salaryChanges:  ${summary.salaryChanges}`);
  console.log(`elapsed:        ${elapsedMs}ms`);

  await pool.end();
}

main();
