import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { DEFAULT_INSIGHTS_BY_COUNTRY } from "../../mocks/handlers";
import { InsightsPage } from "./InsightsPage";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Each body row as [row header, ...cells]; the header names the group.
function rowTexts(table: HTMLElement) {
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      [...within(row).getAllByRole("rowheader"), ...within(row).getAllByRole("cell")].map(
        (cell) => cell.textContent,
      ),
    );
}

describe("InsightsPage", () => {
  it("explains that figures cover active employees in USD at fixed rates", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Insights" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Active employees only. Cross-country figures are converted to USD at fixed exchange rates.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the headline figures as stat tiles in whole dollars", async () => {
    renderPage();

    const summary = await screen.findByRole("region", { name: "Summary" });
    await within(summary).findByText("9,412");

    const tile = (term: string) =>
      within(summary).getByText(term, { selector: "dt" }).nextElementSibling;
    expect(tile("Headcount")).toHaveTextContent("9,412");
    expect(tile("Total payroll")).toHaveTextContent("$987,654,321");
    expect(tile("Median salary")).toHaveTextContent("$98,500");
    expect(tile("Outside pay band")).toHaveTextContent("287");
  });

  it("shows headcount and payroll by country, with country names, in whole dollars", async () => {
    renderPage();

    const table = await screen.findByRole("table", { name: "Headcount and payroll by country" });
    await within(table).findByText("United Kingdom");

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Country", "Headcount", "Total payroll", "Average salary", "Median salary"]);
    expect(rowTexts(table)).toEqual([
      ["United Kingdom", "1,180", "$123,900,000", "$105,000", "$101,200"],
      // 12575050 cents = $125,750.50, which rounds half away from zero.
      ["United States", "2,350", "$305,500,000", "$130,000", "$125,751"],
    ]);
  });

  it("shows headcount and payroll by department", async () => {
    renderPage();

    const table = await screen.findByRole("table", {
      name: "Headcount and payroll by department",
    });
    await within(table).findByText("Engineering");

    expect(rowTexts(table)).toEqual([
      ["Engineering", "2,100", "$273,000,000", "$130,000", "$128,000"],
      ["Sales", "1,500", "$142,500,000", "$95,000", "$91,000"],
    ]);
  });

  it("keeps other sections working when one fails, and retries the failed one", async () => {
    let attempts = 0;
    server.use(
      http.get("/api/insights/by-country", () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ error: "Internal server error" }, { status: 500 })
          : HttpResponse.json(DEFAULT_INSIGHTS_BY_COUNTRY);
      }),
    );

    renderPage();

    const section = await screen.findByRole("region", { name: "By country" });
    expect(await within(section).findByText("Could not load this section.")).toBeInTheDocument();
    expect(await screen.findByText("9,412")).toBeInTheDocument();
    expect(
      await screen.findByRole("table", { name: "Headcount and payroll by department" }),
    ).toBeInTheDocument();

    fireEvent.click(within(section).getByRole("button", { name: "Retry" }));

    expect(await within(section).findByText("United Kingdom")).toBeInTheDocument();
  });

  it("marks a section as busy while it loads", async () => {
    server.use(http.get("/api/insights/summary", () => new Promise(() => {})));

    renderPage();

    const summary = await screen.findByRole("region", { name: "Summary" });
    expect(summary).toHaveAttribute("aria-busy", "true");
  });
});
