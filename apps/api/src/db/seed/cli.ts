import "dotenv/config";
import { db, pool } from "../client";
import { seedDatabase } from "./run";

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
