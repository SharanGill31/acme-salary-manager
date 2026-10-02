# Decisions

## 1. Current salary on `employees`, history in `salary_changes`

Every directory list, filter, sort, and aggregation in the Insights screens needs each employee's current salary, so keeping it as a plain column on `employees` lets those queries run as a single indexed scan instead of a "latest row per employee" subquery repeated across 10,000 rows. `salary_changes` exists purely to answer a different question — how did we get here — so it is append-only and is never joined into the hot read paths. Splitting the two means the common case stays cheap and the audit trail stays complete, instead of compromising one to serve the other.

## 2. Tests use PGlite instead of Docker or a shared test database

PGlite runs Postgres in-process with no server to start, so `npm test` works identically on a fresh clone, in CI, and on a machine with no Docker installed — which this project rules out entirely. Each test gets its own fresh in-memory instance with the real migrations applied, so tests run in parallel without clashing on shared state and never leave data behind for the next run to trip over. A shared test database would reintroduce exactly that cross-test coupling, and Docker would add an engine dependency this project's environment rules explicitly avoid.
