import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./AppRoutes";

// The routing test only proves the insights route is wired to load its page
// on demand. A stub stands in for the real page so this test doesn't pull in
// the charting library (slow to transform under load); InsightsPage.test
// covers the real page.
vi.mock("./features/insights/InsightsPage", () => ({
  InsightsPage: () => <h1>Insights</h1>,
}));

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppRoutes", () => {
  it("renders the not-found page for an unknown route", () => {
    renderAt("/this-route-does-not-exist");

    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it("loads the insights page on demand, showing a labelled loader meanwhile", async () => {
    renderAt("/insights");

    expect(screen.getByRole("progressbar", { name: "Loading page" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Insights" })).toBeInTheDocument();
  });
});
