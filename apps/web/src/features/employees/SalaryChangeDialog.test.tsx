import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { EmployeeDetailResponse } from "shared";
import { server } from "../../mocks/server";
import { DEFAULT_EMPLOYEE_DETAIL } from "../../mocks/handlers";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { SalaryChangeDialog } from "./SalaryChangeDialog";

const UPDATED_DETAIL: EmployeeDetailResponse = {
  ...DEFAULT_EMPLOYEE_DETAIL,
  employee: { ...DEFAULT_EMPLOYEE_DETAIL.employee, salaryMinor: "9500050" },
  salaryHistory: [
    {
      id: 3,
      previousAmountMinor: "9000000",
      newAmountMinor: "9500050",
      currency: "USD",
      effectiveDate: "2026-11-01T00:00:00.000Z",
      reason: "Annual review",
      createdAt: "2026-10-04T09:00:00.000Z",
    },
    ...DEFAULT_EMPLOYEE_DETAIL.salaryHistory,
  ],
};

function renderPage(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/employees/1"]}>
        <Routes>
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

async function openDialog() {
  const button = await screen.findByRole("button", { name: "Change salary" });
  button.focus();
  fireEvent.click(button);
  const dialog = await screen.findByRole("dialog", { name: "Change salary" });
  return { button, dialog };
}

function fillForm(dialog: HTMLElement, values: { amount?: string; date?: string; reason?: string }) {
  if (values.amount !== undefined) {
    fireEvent.change(within(dialog).getByLabelText(/new annual salary/i), {
      target: { value: values.amount },
    });
  }
  if (values.date !== undefined) {
    fireEvent.change(within(dialog).getByLabelText(/effective date/i), {
      target: { value: values.date },
    });
  }
  if (values.reason !== undefined) {
    fireEvent.change(within(dialog).getByLabelText(/reason/i), {
      target: { value: values.reason },
    });
  }
}

function submit(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
}

const VALID = { amount: "95,000.50", date: "2026-11-01", reason: "Annual review" };

describe("Salary change dialog", () => {
  it("opens with labelled fields, the employee's currency and current salary", async () => {
    renderPage();
    const { dialog } = await openDialog();

    expect(within(dialog).getByLabelText(/new annual salary/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/effective date/i)).toHaveAttribute("type", "date");
    expect(within(dialog).getByLabelText(/reason/i)).toBeInTheDocument();
    expect(within(dialog).getByText("USD")).toBeInTheDocument();
    expect(within(dialog).getByText(/current salary: \$90,000\.00/i)).toBeInTheDocument();
  });

  it("shows required-field errors and does not call the API when the form is empty", async () => {
    let called = false;
    server.use(
      http.post("/api/employees/:id/salary-changes", () => {
        called = true;
        return HttpResponse.json({ ...UPDATED_DETAIL, warnings: [] }, { status: 201 });
      }),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, { date: "" });
    submit(dialog);

    expect(await within(dialog).findByText("Enter the new salary")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter the effective date")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a reason")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/new annual salary/i)).toHaveAttribute("aria-invalid", "true");
    expect(called).toBe(false);
  });

  it("rejects an amount that is not valid money for the currency", async () => {
    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, { ...VALID, amount: "1.005" });
    submit(dialog);

    expect(
      await within(dialog).findByText("Enter an amount like 95,000.00"),
    ).toBeInTheDocument();
  });

  it("posts the amount in minor units with the employee's currency", async () => {
    let body: unknown;
    server.use(
      http.post("/api/employees/:id/salary-changes", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...UPDATED_DETAIL, warnings: [] }, { status: 201 });
      }),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, { ...VALID, reason: "  Annual review  " });
    submit(dialog);

    await waitFor(() =>
      expect(body).toEqual({
        new_amount_minor: 9500050,
        currency: "USD",
        effective_date: "2026-11-01",
        reason: "Annual review",
      }),
    );
  });

  it("closes, confirms and shows the new history entry after saving", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json({ ...UPDATED_DETAIL, warnings: [] }, { status: 201 }),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, VALID);
    submit(dialog);

    expect(await screen.findByText("Salary change recorded")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const rows = within(screen.getByRole("table", { name: "Salary history" })).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Nov 1, 2026");
    expect(rows[1]).toHaveTextContent("$95,000.50");
    expect(rows[1]).toHaveTextContent("Annual review");
  });

  it("refreshes the employees list and insights after saving", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json({ ...UPDATED_DETAIL, warnings: [] }, { status: 201 }),
      ),
    );

    const queryClient = renderPage();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { dialog } = await openDialog();
    fillForm(dialog, VALID);
    submit(dialog);

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["employees"] }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["insights"] });
  });

  it("shows server warnings after saving", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json(
          {
            ...UPDATED_DETAIL,
            warnings: ["This change is more than 50% different from the current salary"],
          },
          { status: 201 },
        ),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, VALID);
    submit(dialog);

    expect(
      await screen.findByText(/more than 50% different/i),
    ).toBeInTheDocument();
  });

  it("shows 422 business-rule errors against the matching fields and stays open", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json(
          {
            errors: {
              newAmountMinor: "New salary must be different from the current salary",
              effectiveDate: "Effective date can't be before the hire date",
              reason: "Reason must be at least 3 characters",
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, { amount: "90,000", date: "2019-01-01", reason: "ok" });
    submit(dialog);

    expect(await within(dialog).findByText(/must be different from the current salary/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/new annual salary/i)).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByLabelText(/effective date/i)).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByLabelText(/reason/i)).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByText(/before the hire date/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("moves focus to the first field with a server error", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json(
          {
            errors: {
              effectiveDate: "Effective date can't be before the hire date",
              reason: "Reason must be at least 3 characters",
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, { amount: "95,000", date: "2019-01-01", reason: "ok" });
    submit(dialog);

    await within(dialog).findByText(/before the hire date/i);
    await waitFor(() => expect(within(dialog).getByLabelText(/effective date/i)).toHaveFocus());
  });

  it("shows a general error in the dialog when saving fails unexpectedly", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, VALID);
    submit(dialog);

    expect(
      await within(dialog).findByText(/could not save the salary change/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a general error when a 422 response carries no field errors", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json({ errors: {} }, { status: 422 }),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, VALID);
    submit(dialog);

    expect(
      await within(dialog).findByText(/could not save the salary change/i),
    ).toBeInTheDocument();
  });

  it("keeps showing the salary it opened with even if the employee's salary changes underneath", () => {
    // After saving, the profile cache is updated while the dialog is still
    // fading out; the "Current salary" hint must not flip to the new amount.
    const queryClient = new QueryClient();
    const props = { open: true, onClose: () => {}, onSaved: () => {} };

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <SalaryChangeDialog {...props} employee={DEFAULT_EMPLOYEE_DETAIL.employee} />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={queryClient}>
        <SalaryChangeDialog {...props} employee={UPDATED_DETAIL.employee} />
      </QueryClientProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: "Change salary" });
    expect(within(dialog).getByText("Current salary: $90,000.00")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the Change salary button", async () => {
    renderPage();
    const { button, dialog } = await openDialog();

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  it("closes on Cancel without saving", async () => {
    let called = false;
    server.use(
      http.post("/api/employees/:id/salary-changes", () => {
        called = true;
        return HttpResponse.json({ ...UPDATED_DETAIL, warnings: [] }, { status: 201 });
      }),
    );

    renderPage();
    const { dialog } = await openDialog();
    fillForm(dialog, VALID);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(called).toBe(false);
  });
});
