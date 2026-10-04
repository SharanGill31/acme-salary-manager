import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { DEFAULT_EMPLOYEES, employeesResponse } from "../../mocks/handlers";
import { EmployeesPage } from "./EmployeesPage";

function renderPage(initialEntries: string[] = ["/employees"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<div>Employee detail page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EmployeesPage", () => {
  it("renders rows when the API returns data", async () => {
    renderPage();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("sends the search query param only after the 300ms debounce", async () => {
    let lastUrl: URL | undefined;
    server.use(
      http.get("/api/employees", ({ request }) => {
        lastUrl = new URL(request.url);
        return HttpResponse.json(employeesResponse(DEFAULT_EMPLOYEES));
      }),
    );

    renderPage();
    await screen.findByText("Ada Lovelace");

    vi.useFakeTimers();
    const searchInput = screen.getByRole("textbox", { name: /search/i });
    fireEvent.change(searchInput, { target: { value: "hopper" } });

    expect(lastUrl?.searchParams.get("search")).not.toBe("hopper");

    // The debounce timer itself must be fake to assert it hasn't fired yet,
    // but once it fires, the resulting query refetch runs through real
    // promises/microtasks (MSW, fetch) that fake timers aren't meant to
    // drive — switch back to real timers before waiting on that chain.
    await vi.advanceTimersByTimeAsync(300);
    vi.useRealTimers();

    await waitFor(() => expect(lastUrl?.searchParams.get("search")).toBe("hopper"));
  });

  it("resets to page 1 when a filter changes", async () => {
    let lastUrl: URL | undefined;
    server.use(
      http.get("/api/employees", ({ request }) => {
        lastUrl = new URL(request.url);
        return HttpResponse.json(employeesResponse(DEFAULT_EMPLOYEES));
      }),
    );

    renderPage(["/employees?page=2"]);
    await screen.findByText("Ada Lovelace");

    const countrySelect = screen.getByLabelText(/country/i);
    fireEvent.change(countrySelect, { target: { value: "GB" } });

    await waitFor(() => expect(lastUrl?.searchParams.get("countryCode")).toBe("GB"));
    expect(lastUrl?.searchParams.get("page")).not.toBe("2");
  });

  it("shows an empty state when there are no results", async () => {
    server.use(http.get("/api/employees", () => HttpResponse.json(employeesResponse([]))));

    renderPage();

    expect(await screen.findByText(/no employees found/i)).toBeInTheDocument();
  });

  it("navigates to the employee detail page when Enter is pressed on a row", async () => {
    renderPage();
    await screen.findByText("Ada Lovelace");

    const row = screen.getByText("Ada Lovelace").closest("tr")!;
    fireEvent.keyDown(row, { key: "Enter" });

    expect(await screen.findByText(/employee detail page/i)).toBeInTheDocument();
  });
});
