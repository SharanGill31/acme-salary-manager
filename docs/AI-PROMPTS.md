# AI Prompts and Approach

This document records how AI tools were used to build the Acme Salary Manager, including the key prompts, decisions, and guardrails applied throughout.

## Tools used

- **Claude Code** (Anthropic) — agentic coding assistant used for the entire implementation
- **Claude claude.ai** (Anthropic) — used as a senior reviewer to check Claude Code's plans before approving each step

## Approach

Claude Code was used in a **plan-then-build** workflow. Before writing any code, Claude Code was asked to show a plan and wait for approval. Plans were reviewed against the requirements, the project rules in `CLAUDE.md`, and engineering judgment before proceeding. This kept the AI on a short leash and produced incremental, reviewable commits rather than large unreviewed dumps.

The `CLAUDE.md` file at the repo root encodes the project rules Claude Code followed throughout: strict API layering, test-driven development (failing test first), no client-side sorting or filtering, money as integer minor units, no new dependencies without approval, accessibility requirements, and conventional commit messages.

## Key prompts

### Project setup prompt (given at the start of each session)
```
Read CLAUDE.md and docs/REQUIREMENTS.md. We are building the Acme Salary Manager.
The API is complete with 111 tests. The web has the shell, employees list,
employee profile with salary history and salary change dialog — 45 tests.
Next: [feature]. Show me the plan first.
```

### Standard plan-approval prompt
```
Answers: [decisions]. Go ahead with step 1, failing test first.
```

### Review prompt (used in Claude.ai to check Claude Code's plan)
The plan was checked against:
- Does the edit form reuse the shared Zod schema, or duplicate validation?
- Does mark inactive do a status change (not a delete)?
- Does the form exclude salary (salary changes only through the salary change dialog)?
- Does the step write a failing test before the implementation?
- Are there any new dependencies that weren't approved?

### Insights check prompt
```
Before step 4, CI is failing on main — check the GitHub Actions logs and tell
me what's failing before we continue.
```

### Cleanup prompt
```
Skip the bundle size fix for now. Instead do these three small cleanups in one
commit: delete apps/api/src/domain/money.ts (unused dead code with float bug),
fix the response check to return 500 instead of 400, and delete the unused
code only — no new features.
```

## How decisions were made

Claude Code was asked to present options and trade-offs for non-trivial decisions, then given explicit answers. Examples:

| Decision | Choice made | Reason |
|---|---|---|
| Country→currency list location | Shared constant in `packages/shared` | No migration needed, deterministic, fits seeded-data-only assumption |
| Reactivation (mark active) | Yes, same confirmation component | HR user could mis-click with no way back |
| Salary changes on inactive profiles | Keep allowed | No requirement to block; simpler |
| CSV generation | Server-side, plain link | Never send 10,000 rows to the browser |
| Formula injection protection | Leading apostrophe on all fields | OWASP recommendation; Excel hides it |
| Exchange rates | Fixed table | Deterministic, testable, requirements say fixed |
| Test database | PGlite (in-process) | No test infrastructure needed |
| Charts | Recharts, lazy-loaded | Already in CLAUDE.md stack; lazy load fixes bundle warning |
| Sortable tables on Insights | No | CLAUDE.md says sorting happens in SQL, not the browser |
| Country selector state | Component state, not URL | Requirements don't ask for shareable filtered views |

## Guardrails applied

The following rules were enforced throughout every Claude Code session:

1. **Show plan, wait for approval** — no code written before the plan was reviewed
2. **Failing test first** — every feature step started with a test that failed, proving the test was real
3. **One commit per step** — Claude Code suggested a conventional commit message after each step; the developer committed manually
4. **No new dependencies without approval** — Claude Code asked before adding any package
5. **No client-side data operations** — filtering, sorting, pagination, and aggregation always in SQL
6. **Money never as float** — enforced by code review and a guard test that checks all 73 money values in insights responses are integer strings
7. **Accessibility non-negotiable** — semantic HTML, labelled inputs, keyboard support, visible focus states checked in every form step

## What worked well

- The plan-first workflow caught several issues before code was written (e.g. the flicker bug in the status dialog was anticipated by adding a freeze-on-open pattern)
- Sharing Zod schemas between API and web meant validation messages were consistent without any extra work
- PGlite made API tests fast and self-contained — the full suite runs in about 15 seconds
- Claude Code's self-review caught real bugs: a focus bug affecting all form fields, an invisible BOM character in source, a test that passed alone but failed in the full suite due to shared state

## What to watch

- The main JS bundle is 660 kB (MUI + employee pages). Splitting vendor code or lazy-loading employee pages would reduce it.
- API tests read `packages/shared/dist` (the compiled output). After editing shared schemas, `npm run build:shared` must be run before API tests see the change. The web bypasses this via a Vite alias added during the project.
