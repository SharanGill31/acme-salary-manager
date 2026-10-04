import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { EmployeeStatus } from "shared";
import { server } from "../../mocks/server";
import { DEFAULT_EMPLOYEE_DETAIL } from "../../mocks/handlers";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { StatusChangeDialog } from "./StatusChangeDialog";

// GET reflects whatever status the last PATCH set; patchBodies records what
// was sent.
function useStatefulEmployee(initialStatus: EmployeeStatus) {
  let status = initialStatus;
  const patchBodies: unknown[] = [];
  const detail = () => ({
    ...DEFAULT_EMPLOYEE_DETAIL,
    employee: { ...DEFAULT_EMPLOYEE_DETAIL.employee, status },
  });
  server.use(
    http.get("/api/employees/:id", () => HttpResponse.json(detail())),
    http.patch("/api/employees/:id", async ({ request }) => {
      const body = (await request.json()) as { status: EmployeeStatus };
      patchBodies.push(body);
      status = body.status;
      return HttpResponse.json(detail().employee);
    }),
  );
  return patchBodies;
}

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

async function openDialog(buttonName: string, dialogName: string) {
  const button = await screen.findByRole("button", { name: buttonName });
  button.focus();
  fireEvent.click(button);
  const dialog = await screen.findByRole("dialog", { name: dialogName });
  return { button, dialog };
}

function statusDetail() {
  return screen.getByText("Status", { selector: "dt" }).nextElementSibling;
}

describe("Mark inactive / Mark active", () => {
  it("offers Mark inactive, not Mark active, for an active employee", async () => {
    useStatefulEmployee("active");
    renderPage();

    expect(await screen.findByRole("button", { name: "Mark inactive" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark active" })).not.toBeInTheDocument();
  });

  it("asks for confirmation and explains what marking inactive means", async () => {
    useStatefulEmployee("active");
    renderPage();

    const { dialog } = await openDialog("Mark inactive", "Mark Ada Lovelace as inactive?");

    expect(dialog).toHaveAccessibleDescription(
      "They stay in the directory and their salary history is kept. Inactive employees are not counted in insights.",
    );
  });

  it("marks the employee inactive after confirmation", async () => {
    const patchBodies = useStatefulEmployee("active");
    const queryClient = renderPage();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { dialog } = await openDialog("Mark inactive", "Mark Ada Lovelace as inactive?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark inactive" }));

    expect(await screen.findByText("Ada Lovelace marked as inactive")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patchBodies).toEqual([{ status: "inactive" }]);
    expect(await screen.findByRole("button", { name: "Mark active" })).toBeInTheDocument();
    expect(statusDetail()).toHaveTextContent("Inactive");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["employees"] });
  });

  it("reactivates an inactive employee after confirmation", async () => {
    const patchBodies = useStatefulEmployee("inactive");
    renderPage();

    const { dialog } = await openDialog("Mark active", "Mark Ada Lovelace as active?");
    expect(dialog).toHaveAccessibleDescription(
      "They will be counted in insights again. Their details and salary history are unchanged.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark active" }));

    expect(await screen.findByText("Ada Lovelace marked as active")).toBeInTheDocument();
    expect(patchBodies).toEqual([{ status: "active" }]);
    expect(await screen.findByRole("button", { name: "Mark inactive" })).toBeInTheDocument();
    expect(statusDetail()).toHaveTextContent("Active");
  });

  it("keeps Change salary available for an inactive employee", async () => {
    useStatefulEmployee("inactive");
    renderPage();

    expect(await screen.findByRole("button", { name: "Change salary" })).toBeEnabled();
  });

  it("shows an error in the dialog when the update fails, and stays open", async () => {
    useStatefulEmployee("active");
    server.use(
      http.patch("/api/employees/:id", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
      ),
    );
    renderPage();

    const { dialog } = await openDialog("Mark inactive", "Mark Ada Lovelace as inactive?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark inactive" }));

    expect(await within(dialog).findByText(/could not update the status/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("cancels without changing anything and returns focus to the button", async () => {
    const patchBodies = useStatefulEmployee("active");
    renderPage();

    const { button, dialog } = await openDialog("Mark inactive", "Mark Ada Lovelace as inactive?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patchBodies).toEqual([]);
    expect(button).toHaveFocus();
  });

  it("keeps its wording while open even if the employee's status changes underneath", () => {
    // After saving, the profile refetches while the dialog is still fading
    // out; the dialog must not flip to the opposite action mid-close.
    const queryClient = new QueryClient();
    const inactive = { ...DEFAULT_EMPLOYEE_DETAIL.employee, status: "inactive" as const };
    const active = { ...inactive, status: "active" as const };
    const props = { open: true, onClose: () => {}, onSaved: () => {} };

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <StatusChangeDialog {...props} employee={inactive} />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={queryClient}>
        <StatusChangeDialog {...props} employee={active} />
      </QueryClientProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: "Mark Ada Lovelace as active?" });
    expect(within(dialog).getByRole("button", { name: "Mark active" })).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    useStatefulEmployee("active");
    renderPage();

    const { dialog } = await openDialog("Mark inactive", "Mark Ada Lovelace as inactive?");
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
