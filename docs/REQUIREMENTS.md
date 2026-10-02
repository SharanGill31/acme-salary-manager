# Requirements

## Goal

Replace the HR team's Excel files with a web app where the HR Manager manages salary data for 10,000 employees and answers questions about how the organisation pays people.

## Persona

HR Manager. Not technical. Works in a desktop browser.

## In scope

1. **Employee directory** — search by name, email, or employee code; filter by country, department, level, and status; sort; server-side pagination.
2. **Employee profile** — view and edit details, add an employee, mark an employee inactive.
3. **Salary change** — record a new salary with an effective date and a reason. Every change is kept as history.
4. **Insights** — headcount and total payroll by country and by department; minimum, median, average, and maximum salary by level; employees outside the pay band for their level. Cross-country figures are shown in USD using a fixed rate table.
5. **CSV export** of the filtered employee list.

## Out of scope

- **Login and roles** — one persona and synthetic data. First thing to add for production.
- **Payroll runs, tax, and payslips** — a different product.
- **Bonuses, equity, and benefits** — base salary answers the stated questions.
- **Approval workflows** — there is one user.
- **Live exchange rates** — a fixed table keeps results deterministic and testable.
- **Excel import** — seeded data covers the need, and CSV export covers hand-off.

## Assumptions

- Salary means annual base salary.
- One base currency (USD) for cross-country comparison.
- Salary history is kept indefinitely.
- No login.
- Seeded data only.

## Success criteria

- Find any employee in under 10 seconds.
- Change a salary and see it reflected in history.
- Answer the insight questions without a spreadsheet.
- List requests respond in under 300ms with 10,000 employees.
