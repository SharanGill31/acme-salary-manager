import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { DEFAULT_EMPLOYEE_DETAIL } from "../../mocks/handlers";
import { EmployeeDetailPage } from "./EmployeeDetailPage";

function renderPage(path = "/employees/1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/employees" element={<div>Employees list page</div>} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function getDetail(term: string) {
  const dt = screen.getByText(term, { selector: "dt" });
  return dt.nextElementSibling;
}

describe("EmployeeDetailPage", () => {
  it("requests the employee for the id in the URL", async () => {
    let requestedId: string | readonly string[] | undefined;
    server.use(
      http.get("/api/employees/:id", ({ params }) => {
        requestedId = params.id;
        return HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL);
      }),
    );

    renderPage("/employees/42");

    await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" });
    expect(requestedId).toBe("42");
  });

  it("shows the employee's details", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeInTheDocument();
    expect(getDetail("Employee code")).toHaveTextContent("EMP000001");
    expect(getDetail("Email")).toHaveTextContent("ada.lovelace@acme.example");
    expect(getDetail("Job title")).toHaveTextContent("Software Engineer");
    expect(getDetail("Department")).toHaveTextContent("Engineering");
    expect(getDetail("Level")).toHaveTextContent("L3");
    expect(getDetail("Country")).toHaveTextContent("US");
    expect(getDetail("Status")).toHaveTextContent("Active");
    expect(getDetail("Hire date")).toHaveTextContent("Jan 10, 2020");
    expect(getDetail("Current salary")).toHaveTextContent("$90,000.00");
  });

  it("links back to the employees list", async () => {
    renderPage();

    const backLink = await screen.findByRole("link", { name: /back to employees/i });
    expect(backLink).toHaveAttribute("href", "/employees");
  });

  it("shows the pay band range, position and compa-ratio", async () => {
    renderPage();

    const section = await screen.findByRole("region", { name: "Pay band" });
    expect(within(section).getByText("Within band")).toBeInTheDocument();
    expect(within(section).getByText("$80,000.00 – $120,000.00")).toBeInTheDocument();
    expect(within(section).getByText("90%")).toBeInTheDocument();
    expect(
      within(section).getByRole("img", { name: /salary sits at 25% of the band/i }),
    ).toBeInTheDocument();
  });

  it("labels a salary below the band", async () => {
    server.use(
      http.get("/api/employees/:id", () =>
        HttpResponse.json({
          ...DEFAULT_EMPLOYEE_DETAIL,
          employee: { ...DEFAULT_EMPLOYEE_DETAIL.employee, salaryMinor: "7000000" },
          bandPosition: "below",
          compaRatio: 0.7,
        }),
      ),
    );

    renderPage();

    const section = await screen.findByRole("region", { name: "Pay band" });
    expect(within(section).getByText("Below band")).toBeInTheDocument();
    expect(within(section).getByRole("img", { name: /below the band minimum/i })).toBeInTheDocument();
  });

  it("lists salary history newest first with the change from the previous amount", async () => {
    renderPage();

    const table = await screen.findByRole("table", { name: "Salary history" });
    const rows = within(table).getAllByRole("row").slice(1);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Apr 1, 2023");
    expect(rows[0]).toHaveTextContent("$80,000.00");
    expect(rows[0]).toHaveTextContent("$90,000.00");
    expect(rows[0]).toHaveTextContent("+12.5%");
    expect(rows[0]).toHaveTextContent("Promotion to L3");

    expect(rows[1]).toHaveTextContent("Jan 10, 2020");
    expect(rows[1]).toHaveTextContent("—");
    expect(rows[1]).toHaveTextContent("Initial salary");
  });

  it("shows a not-found message when the employee does not exist", async () => {
    server.use(
      http.get("/api/employees/:id", () =>
        HttpResponse.json({ error: "Employee not found" }, { status: 404 }),
      ),
    );

    renderPage("/employees/999");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Employee not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to employees/i })).toBeInTheDocument();
  });

  it("shows not-found without calling the API when the id is not a number", async () => {
    let called = false;
    server.use(
      http.get("/api/employees/:id", () => {
        called = true;
        return HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL);
      }),
    );

    renderPage("/employees/abc");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Employee not found" }),
    ).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("shows an error with a retry button when loading fails, and retries", async () => {
    let attempts = 0;
    server.use(
      http.get("/api/employees/:id", () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ error: "Internal server error" }, { status: 500 })
          : HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL);
      }),
    );

    renderPage();

    expect(await screen.findByText(/failed to load employee/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeInTheDocument(),
    );
  });
});
