import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { DEFAULT_EMPLOYEE_DETAIL, DEFAULT_EMPLOYEES } from "../../mocks/handlers";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { NewEmployeePage } from "./NewEmployeePage";

function renderPage(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/employees/new"]}>
        <Routes>
          <Route path="/employees" element={<div>Employees list page</div>} />
          <Route path="/employees/new" element={<NewEmployeePage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

function field(label: RegExp) {
  return screen.getByLabelText(label);
}

function change(label: RegExp, value: string) {
  fireEvent.change(field(label), { target: { value } });
}

async function fillValidForm(overrides: Partial<Record<string, string>> = {}) {
  await within(field(/department/i)).findByRole("option", { name: "Sales" });
  const values = {
    fullName: "Katherine Johnson",
    email: "katherine.johnson@acme.example",
    employeeCode: "EMP010001",
    country: "US",
    department: "2",
    jobTitle: "Data Scientist",
    level: "L4",
    hireDate: "2026-11-01",
    salary: "135,000",
    ...overrides,
  };
  change(/full name/i, values.fullName);
  change(/email/i, values.email);
  change(/employee code/i, values.employeeCode);
  change(/country/i, values.country);
  change(/department/i, values.department);
  change(/job title/i, values.jobTitle);
  change(/level/i, values.level);
  change(/hire date/i, values.hireDate);
  change(/annual salary/i, values.salary);
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Add employee" }));
}

describe("NewEmployeePage", () => {
  it("shows a labelled form with no status or editable currency field", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Add employee" }),
    ).toBeInTheDocument();
    for (const label of [
      /full name/i,
      /email/i,
      /employee code/i,
      /country/i,
      /department/i,
      /job title/i,
      /level/i,
      /hire date/i,
      /annual salary/i,
    ]) {
      expect(field(label)).toBeInTheDocument();
    }
    expect(field(/hire date/i)).toHaveAttribute("type", "date");
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^currency/i)).not.toBeInTheDocument();
  });

  it("lists every country Acme employs people in, with its currency", async () => {
    renderPage();

    const options = within(await screen.findByLabelText(/country/i)).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Choose a country",
      "United States (USD)",
      "India (INR)",
      "United Kingdom (GBP)",
      "Germany (EUR)",
      "Canada (CAD)",
      "Australia (AUD)",
      "Singapore (SGD)",
      "Brazil (BRL)",
    ]);
  });

  it("keeps salary disabled until a country is chosen, then shows that country's currency", async () => {
    renderPage();

    expect(await screen.findByLabelText(/annual salary/i)).toBeDisabled();
    expect(screen.getByText("Choose a country first")).toBeInTheDocument();

    change(/country/i, "GB");

    expect(field(/annual salary/i)).toBeEnabled();
    expect(screen.getByText("GBP")).toBeInTheDocument();
  });

  it("validates with the shared schema messages, focuses the first error, and sends nothing", async () => {
    let called = false;
    server.use(
      http.post("/api/employees", () => {
        called = true;
        return HttpResponse.json(DEFAULT_EMPLOYEES[0], { status: 201 });
      }),
    );

    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Add employee" });
    submit();

    expect(await screen.findByText("Enter a full name")).toBeInTheDocument();
    // Each message must be announced with its field (and the selects'
    // placeholder options reuse the "Choose a …" wording, so match per field).
    const expected: [RegExp, string][] = [
      [/full name/i, "Enter a full name"],
      [/email/i, "Enter a valid email address"],
      [/employee code/i, "Enter an employee code"],
      [/country/i, "Choose a country"],
      [/department/i, "Choose a department"],
      [/job title/i, "Enter a job title"],
      [/level/i, "Choose a level"],
      [/hire date/i, "Enter a hire date"],
    ];
    for (const [label, message] of expected) {
      expect(field(label)).toHaveAccessibleDescription(message);
      expect(field(label)).toHaveAttribute("aria-invalid", "true");
    }
    await waitFor(() => expect(field(/full name/i)).toHaveFocus());
    expect(called).toBe(false);
  });

  it("rejects a salary that isn't valid money for the currency, or is zero", async () => {
    renderPage();
    await fillValidForm({ salary: "1.005" });
    submit();

    expect(await screen.findByText("Enter an amount like 95,000.00")).toBeInTheDocument();

    change(/annual salary/i, "0");
    submit();

    expect(await screen.findByText("Enter a salary greater than zero")).toBeInTheDocument();
  });

  it("sends the employee as active, with the country's currency and the salary in minor units", async () => {
    let body: unknown;
    server.use(
      http.post("/api/employees", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...DEFAULT_EMPLOYEES[0], id: 3 }, { status: 201 });
      }),
    );

    renderPage();
    await fillValidForm();
    submit();

    await waitFor(() =>
      expect(body).toEqual({
        full_name: "Katherine Johnson",
        email: "katherine.johnson@acme.example",
        employee_code: "EMP010001",
        country_code: "US",
        department_id: 2,
        job_title: "Data Scientist",
        level: "L4",
        hire_date: "2026-11-01",
        salary_minor: 13500000,
        currency: "USD",
        status: "active",
      }),
    );
  });

  it("opens the new employee's profile with a confirmation and refreshes the list", async () => {
    let requestedId: string | readonly string[] | undefined;
    server.use(
      http.post("/api/employees", () =>
        HttpResponse.json({ ...DEFAULT_EMPLOYEES[0], id: 3 }, { status: 201 }),
      ),
      http.get("/api/employees/:id", ({ params }) => {
        requestedId = params.id;
        return HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL);
      }),
    );

    const queryClient = renderPage();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await fillValidForm();
    submit();

    expect(await screen.findByText("Employee added")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeInTheDocument();
    expect(requestedId).toBe("3");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["employees"] });
  });

  it("shows a 409 conflict on the field the server names", async () => {
    server.use(
      http.post("/api/employees", () =>
        HttpResponse.json(
          {
            error: "An employee with this employee code already exists",
            errors: { employee_code: "An employee with this employee code already exists" },
          },
          { status: 409 },
        ),
      ),
    );

    renderPage();
    await fillValidForm();
    submit();

    expect(
      await screen.findByText("An employee with this employee code already exists"),
    ).toBeInTheDocument();
    expect(field(/employee code/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a 422 currency error against the country", async () => {
    server.use(
      http.post("/api/employees", () =>
        HttpResponse.json(
          { errors: { currency: "Currency must be the country's currency (USD)" } },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    await fillValidForm();
    submit();

    expect(
      await screen.findByText("Currency must be the country's currency (USD)"),
    ).toBeInTheDocument();
    expect(field(/country/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows 400 field errors from the server on the salary field", async () => {
    server.use(
      http.post("/api/employees", () =>
        HttpResponse.json(
          {
            error: "Invalid request",
            fieldErrors: { salary_minor: ["Enter a salary greater than zero"] },
          },
          { status: 400 },
        ),
      ),
    );

    renderPage();
    await fillValidForm();
    submit();

    expect(await screen.findByText("Enter a salary greater than zero")).toBeInTheDocument();
    expect(field(/annual salary/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a general error when saving fails unexpectedly", async () => {
    server.use(
      http.post("/api/employees", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
      ),
    );

    renderPage();
    await fillValidForm();
    submit();

    expect(await screen.findByText(/could not add the employee/i)).toBeInTheDocument();
  });

  it("goes back to the employees list on Cancel", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("link", { name: "Cancel" }));

    expect(await screen.findByText("Employees list page")).toBeInTheDocument();
  });
});
