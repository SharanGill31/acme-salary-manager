# Architecture

## Overview

Acme Salary Manager is a full-stack web application built as a monorepo with three workspaces: `apps/api`, `apps/web`, and `packages/shared`.

```
apps/
  api/        Node.js + Express + Drizzle ORM (backend)
  web/        React + Vite + Material UI (frontend)
packages/
  shared/     Zod schemas and types shared by both apps
```

## Stack

| Layer | Technology | Reason |
|---|---|---|
| API | Node.js, Express, TypeScript | Familiar, lightweight, fast to build |
| ORM | Drizzle ORM | Type-safe SQL, great PostgreSQL support, no magic |
| Database | PostgreSQL (Neon) | Serverless hosting, easy branching, free tier |
| Validation | Zod (in `packages/shared`) | One schema used by API and web — no duplication |
| Frontend | React, Vite, TypeScript | Fast dev server, strong ecosystem |
| UI library | Material UI | Accessible components out of the box |
| Data fetching | TanStack Query | Caching, background refetch, invalidation |
| Forms | React Hook Form + zodResolver | Connects directly to shared Zod schemas |
| Charts | Recharts | Already in the stack, lazy-loaded to keep bundle small |
| Tests (API) | Vitest + Supertest + PGlite | In-process Postgres, no test database needed |
| Tests (web) | Vitest + React Testing Library | Fast, no browser required |
| CI | GitHub Actions | Runs lint, typecheck, tests, and build on every push |
| Deployment | Render | Free tier, supports Node services and static sites |

## Key architectural decisions

### Shared Zod schemas
All validation schemas live in `packages/shared`. The API uses them for request parsing; the web uses them with `zodResolver` for form validation. A change to a field rule propagates to both sides automatically, and the TypeScript types are derived from the schemas rather than written by hand.

### Strict API layering
Routes → Services → Repositories. Routes handle HTTP concerns only. Services contain business logic and receive repositories as arguments (dependency injection), so tests can pass in fakes. Repositories contain all SQL. Domain functions in `apps/api/src/domain` are pure functions with no I/O.

### Money as integer minor units
Salary is stored and passed as integer cents (or equivalent minor units) plus an ISO 4217 currency code. The web formats it for display using `Intl.NumberFormat`. This avoids floating-point rounding errors throughout the stack.

### In-process test database
API integration tests use PGlite — a WebAssembly build of PostgreSQL that runs in the test process. Drizzle migrations are applied against it before each test file. No test database server is needed, and tests run in CI without any infrastructure.

### Server-side filtering, sorting, and pagination
All filtering, sorting, pagination, and aggregation happen in SQL via Drizzle. The browser never receives more rows than one page. The employee list sort always includes `id ASC` as a tiebreaker so pagination is stable.

### CSV export as a server-generated file
The export endpoint streams a UTF-8 CSV with BOM directly from the server. The web links to it as a plain `<a href>` with the current filter parameters. The 10,000-row file never passes through the browser's memory.

### Insights exclude inactive employees
Every insights query filters on `employees.status = 'active'`. The test suite includes two inactive employees with extreme salaries specifically to catch a broken filter.

### Lazy-loaded Insights route
The Insights page and Recharts are in a separate bundle loaded on demand via `React.lazy`. The main bundle stays below the chunk-size warning threshold.

## Data model

```
departments        id, name
employees          id, employee_code, full_name, email, country_code,
                   department_id, job_title, level, status, hire_date,
                   salary_minor, currency
salary_changes     id, employee_id, new_salary_minor, currency,
                   effective_date, reason, recorded_at
pay_bands          id, level, country_code, min_salary_minor,
                   max_salary_minor, currency
exchange_rates     id, from_currency, to_currency, rate
```

`salary_minor` stores annual base salary as integer minor units (e.g. cents for USD). The current salary on `employees` is denormalised for fast list queries; every change is recorded in `salary_changes`.

## CI pipeline

```
npm ci
npm run build:shared      ← shared must be built before anything reads it
npm run lint
npm run typecheck
npm run test              ← API (PGlite) + web (jsdom), 121 + 127 tests
npm run build             ← vite build for web, tsc for api
```

## Deployment (Render)

- **API**: Node web service. Start command: `node apps/api/dist/server.js`. Environment variable: `DATABASE_URL` (Neon pooler URL).
- **Web**: Static site. Build command: `npm ci && npm run build -w apps/web`. Publish directory: `apps/web/dist`. A rewrite rule proxies `/api/*` to the API service so the web and API share the same origin.
- **Database**: Neon PostgreSQL. Migrations and seeding are run manually from a local machine before deploy using the direct (non-pooler) connection string.

## What was deliberately left out

See `docs/REQUIREMENTS.md` for the full out-of-scope list. Key decisions:

- **No authentication**: the requirements specify one persona and synthetic data. Adding auth is the first production step.
- **No live exchange rates**: a fixed rate table keeps results deterministic and testable.
- **No Excel import**: the seed script covers the data need; CSV export covers hand-off.
- **No approval workflows**: single user, no need.
