import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { DEFAULT_EMPLOYEE_DETAIL } from "../../mocks/handlers";
import { EmployeeDetailPage } from "./EmployeeDetailPage";

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
  const button = await screen.findByRole("button", { name: "Edit details" });
  button.focus();
  fireEvent.click(button);
  const dialog = await screen.findByRole("dialog", { name: "Edit details" });
  return { button, dialog };
}

function change(dialog: HTMLElement, label: RegExp, value: string) {
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
}

function saveButton(dialog: HTMLElement) {
  return within(dialog).getByRole("button", { name: "Save" });
}

describe("Edit details dialog", () => {
  it("opens with the employee's current details and no salary or currency fields", async () => {
    renderPage();
    const { dialog } = await openDialog();

    expect(within(dialog).getByLabelText(/full name/i)).toHaveValue("Ada Lovelace");
    expect(within(dialog).getByLabelText(/email/i)).toHaveValue("ada.lovelace@acme.example");
    expect(within(dialog).getByLabelText(/job title/i)).toHaveValue("Software Engineer");
    expect(within(dialog).getByLabelText(/department/i)).toHaveValue("1");
    expect(within(dialog).getByLabelText(/level/i)).toHaveValue("L3");

    expect(within(dialog).queryByLabelText(/salary/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/currency/i)).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(/employee code, country and hire date can't be changed/i),
    ).toBeInTheDocument();
  });

  it("offers the departments from the reference data", async () => {
    renderPage();
    const { dialog } = await openDialog();

    const department = within(dialog).getByLabelText(/department/i);
    await within(department).findByRole("option", { name: "Sales" });
    expect(within(department).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Engineering",
      "Sales",
    ]);
  });

  it("keeps Save disabled until something changes", async () => {
    renderPage();
    const { dialog } = await openDialog();

    expect(saveButton(dialog)).toBeDisabled();
    change(dialog, /job title/i, "Staff Engineer");
    expect(saveButton(dialog)).toBeEnabled();
  });

  it("validates with the shared schema messages and does not call the API", async () => {
    let called = false;
    server.use(
      http.patch("/api/employees/:id", () => {
        called = true;
        return HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL.employee);
      }),
    );

    renderPage();
    const { dialog } = await openDialog();
    change(dialog, /full name/i, "   ");
    change(dialog, /email/i, "not-an-email");
    change(dialog, /job title/i, "");
    fireEvent.click(saveButton(dialog));

    expect(await within(dialog).findByText("Enter a full name")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a valid email address")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a job title")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
    expect(called).toBe(false);
  });

  it("sends only the fields that changed", async () => {
    let body: unknown;
    server.use(
      http.patch("/api/employees/:id", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL.employee);
      }),
    );

    renderPage();
    const { dialog } = await openDialog();
    await within(within(dialog).getByLabelText(/department/i)).findByRole("option", { name: "Sales" });
    change(dialog, /job title/i, "  Staff Engineer  ");
    change(dialog, /department/i, "2");
    change(dialog, /level/i, "L4");
    fireEvent.click(saveButton(dialog));

    await waitFor(() =>
      expect(body).toEqual({ job_title: "Staff Engineer", department_id: 2, level: "L4" }),
    );
  });

  it("closes, confirms, and shows the refreshed profile after saving", async () => {
    let saved = false;
    const updated = {
      ...DEFAULT_EMPLOYEE_DETAIL,
      employee: { ...DEFAULT_EMPLOYEE_DETAIL.employee, fullName: "Ada King" },
    };
    server.use(
      http.get("/api/employees/:id", () =>
        HttpResponse.json(saved ? updated : DEFAULT_EMPLOYEE_DETAIL),
      ),
      http.patch("/api/employees/:id", () => {
        saved = true;
        return HttpResponse.json(updated.employee);
      }),
    );

    const queryClient = renderPage();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { dialog } = await openDialog();
    change(dialog, /full name/i, "Ada King");
    fireEvent.click(saveButton(dialog));

    expect(await screen.findByText("Details updated")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("heading", { level: 1, name: "Ada King" })).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["employees"] });
  });

  it("shows a 409 email conflict on the email field and stays open", async () => {
    server.use(
      http.patch("/api/employees/:id", () =>
        HttpResponse.json(
          { error: "An employee with email grace.hopper@acme.example already exists" },
          { status: 409 },
        ),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    change(dialog, /email/i, "grace.hopper@acme.example");
    fireEvent.click(saveButton(dialog));

    expect(
      await within(dialog).findByText("An employee with email grace.hopper@acme.example already exists"),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows 400 field errors from the server on the matching field", async () => {
    server.use(
      http.patch("/api/employees/:id", () =>
        HttpResponse.json(
          { error: "Invalid request", fieldErrors: { job_title: ["Enter a job title"] } },
          { status: 400 },
        ),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    change(dialog, /job title/i, "Staff Engineer");
    fireEvent.click(saveButton(dialog));

    expect(await within(dialog).findByText("Enter a job title")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/job title/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a general error in the dialog when saving fails unexpectedly", async () => {
    server.use(
      http.patch("/api/employees/:id", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
      ),
    );

    renderPage();
    const { dialog } = await openDialog();
    change(dialog, /job title/i, "Staff Engineer");
    fireEvent.click(saveButton(dialog));

    expect(await within(dialog).findByText(/could not save the changes/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the Edit details button", async () => {
    renderPage();
    const { button, dialog } = await openDialog();

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  it("closes on Cancel without saving", async () => {
    let called = false;
    server.use(
      http.patch("/api/employees/:id", () => {
        called = true;
        return HttpResponse.json(DEFAULT_EMPLOYEE_DETAIL.employee);
      }),
    );

    renderPage();
    const { dialog } = await openDialog();
    change(dialog, /job title/i, "Staff Engineer");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(called).toBe(false);
  });
});
