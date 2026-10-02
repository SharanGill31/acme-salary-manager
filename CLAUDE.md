# CLAUDE.md

Project rules for working on the Acme Salary Manager take-home assessment: a salary management web app for an HR Manager at a company with 10,000 employees across several countries.

## Stack

- Monorepo using npm workspaces: `apps/api`, `apps/web`, `packages/shared`.
- API: Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL.
- Web: React, Vite, TypeScript, React Router, TanStack Query, Material UI, React Hook Form, Recharts.
- Validation: Zod schemas live in `packages/shared` and are imported by both API and web — one schema, not duplicated.
- Tests: Vitest, Supertest, React Testing Library, Playwright.

## Environment

- Windows with PowerShell. No Docker anywhere in this project.
- Every npm script must run in PowerShell: no bash-only syntax (`&&` chains relying on bash, `$(...)`, etc.) and no inline `VAR=value` prefixes. Use `cross-env` or small Node scripts for anything environment- or OS-sensitive.
- Development and production both use hosted PostgreSQL (Neon). The connection string is read from `DATABASE_URL` in a `.env` file that is never committed.
- Tests never need a database server. Integration tests use PGlite (in-process Postgres) with the real Drizzle migrations applied against it.

## Architecture

- API layering is strict: `routes -> services -> repositories`. Routes don't talk to repositories directly, and services don't build HTTP concerns.
- Domain logic lives in `apps/api/src/domain` as pure functions with no I/O (no DB calls, no `fetch`, no `Date.now()` side effects baked in — pass inputs explicitly).
- Services receive repositories as constructor/function arguments (dependency injection) so tests can pass in fakes instead of hitting a real database.
- Money is always stored and passed around as integer minor units (e.g. cents) plus an ISO 4217 currency code. Never use floats for money, anywhere in the stack.
- Filtering, sorting, pagination, and aggregation happen in SQL (via Drizzle), never client-side in the browser.

## Way of working

- Test-driven: write the failing test first, run it and show it failing, then write the minimum code to make it pass, then refactor.
- Before starting any task, show a short plan and wait for approval before writing code.
- Work in small steps. After each step, stop and suggest a Conventional Commits message — don't bundle multiple steps into one commit message.
- Never run `git commit`. The user commits.
- Ask before adding any new dependency, including dev dependencies and `@types` packages.
- Accessibility is not optional: semantic HTML, labelled form inputs, full keyboard support, visible focus states.
- Keep it simple. Don't build anything that isn't specified in `docs/REQUIREMENTS.md`.
