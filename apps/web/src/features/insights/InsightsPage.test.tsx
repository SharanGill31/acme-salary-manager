import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import {
  DEFAULT_INSIGHTS_BY_COUNTRY,
  DEFAULT_INSIGHTS_BY_LEVEL_USD,
  DEFAULT_INSIGHTS_OUTLIERS,
} from "../../mocks/handlers";
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

  describe("salary by level", () => {
    const GB_LEVELS = {
      currency: "GBP",
      levels: [
        {
          level: "L1",
          minSalaryMinor: "2800000",
          medianSalaryMinor: "4100000",
          averageSalaryMinor: "4212550",
          maxSalaryMinor: "6200000",
        },
      ],
    };

    function levelSection() {
      return screen.findByRole("region", { name: "Salary by level" });
    }

    it("shows min, median, average and max per level across all countries in USD", async () => {
      let search: string | undefined;
      server.use(
        http.get("/api/insights/by-level", ({ request }) => {
          search = new URL(request.url).search;
          return HttpResponse.json(DEFAULT_INSIGHTS_BY_LEVEL_USD);
        }),
      );

      renderPage();
      const section = await levelSection();
      const table = await within(section).findByRole("table", { name: "Salary by level" });

      expect(search).toBe("");
      expect(within(section).getByLabelText("Country")).toHaveValue("");
      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((header) => header.textContent),
      ).toEqual(["Level", "Minimum", "Median", "Average", "Maximum"]);
      expect(rowTexts(table)).toEqual([
        ["L1", "$35,000", "$52,000", "$53,500", "$79,000"],
        ["L2", "$50,000", "$74,000", "$75,250", "$102,000"],
      ]);
      expect(within(section).getByText("Amounts in USD, all countries.")).toBeInTheDocument();
    });

    it("offers all countries in USD or one country in its own currency", async () => {
      renderPage();
      const section = await levelSection();

      const options = within(within(section).getByLabelText("Country")).getAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([
        "All countries (USD)",
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

    it("switches to one country's figures in its local currency", async () => {
      let countryCode: string | null = null;
      server.use(
        http.get("/api/insights/by-level", ({ request }) => {
          countryCode = new URL(request.url).searchParams.get("countryCode");
          return HttpResponse.json(countryCode === "GB" ? GB_LEVELS : DEFAULT_INSIGHTS_BY_LEVEL_USD);
        }),
      );

      renderPage();
      const section = await levelSection();
      await within(section).findByRole("table", { name: "Salary by level" });

      fireEvent.change(within(section).getByLabelText("Country"), { target: { value: "GB" } });

      expect(await within(section).findByText("£28,000")).toBeInTheDocument();
      expect(countryCode).toBe("GB");
      expect(rowTexts(within(section).getByRole("table", { name: "Salary by level" }))).toEqual([
        ["L1", "£28,000", "£41,000", "£42,126", "£62,000"],
      ]);
      expect(within(section).getByText("Amounts in GBP, United Kingdom only.")).toBeInTheDocument();
    });

    it("keeps the country selector usable when loading a country fails", async () => {
      server.use(
        http.get("/api/insights/by-level", ({ request }) =>
          new URL(request.url).searchParams.get("countryCode") === "GB"
            ? HttpResponse.json({ error: "Internal server error" }, { status: 500 })
            : HttpResponse.json(DEFAULT_INSIGHTS_BY_LEVEL_USD),
        ),
      );

      renderPage();
      const section = await levelSection();
      await within(section).findByRole("table", { name: "Salary by level" });

      fireEvent.change(within(section).getByLabelText("Country"), { target: { value: "GB" } });
      expect(await within(section).findByText("Could not load this section.")).toBeInTheDocument();

      fireEvent.change(within(section).getByLabelText("Country"), { target: { value: "" } });
      expect(await within(section).findByText("$35,000")).toBeInTheDocument();
    });

    it("says so when a country has no active employees", async () => {
      server.use(
        http.get("/api/insights/by-level", () =>
          HttpResponse.json({ currency: "SGD", levels: [] }),
        ),
      );

      renderPage();
      const section = await levelSection();

      expect(await within(section).findByText("No active employees")).toBeInTheDocument();
    });
  });

  describe("employees outside their pay band", () => {
    function outliersSection() {
      return screen.findByRole("region", { name: "Employees outside their pay band" });
    }

    function cells(row: HTMLElement) {
      return [...within(row).getAllByRole("rowheader"), ...within(row).getAllByRole("cell")];
    }

    it("lists each employee with their salary against their band, in their own currency", async () => {
      renderPage();
      const section = await outliersSection();
      const table = await within(section).findByRole("table", {
        name: "Employees outside their pay band",
      });

      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((header) => header.textContent),
      ).toEqual(["Employee", "Country", "Level", "Salary", "Pay band", "Position", "Compa-ratio"]);

      const [grace, alan] = within(table).getAllByRole("row").slice(1);

      expect(within(grace).getByRole("link", { name: "Grace Hopper" })).toHaveAttribute(
        "href",
        "/employees/7",
      );
      expect(cells(grace).map((cell) => cell.textContent)).toEqual([
        "Grace HopperEMP000007",
        "United Kingdom",
        "L5",
        "£180,000.00",
        "£110,000.00 – £150,000.00",
        "Above band",
        "138%",
      ]);
      expect(cells(alan).map((cell) => cell.textContent)).toEqual([
        "Alan TuringEMP000012",
        "United States",
        "L2",
        "$48,000.00",
        "$60,000.00 – $80,000.00",
        "Below band",
        "69%",
      ]);
    });

    it("pages through the list on the server", async () => {
      const pages: (string | null)[] = [];
      server.use(
        http.get("/api/insights/outliers", ({ request }) => {
          const page = new URL(request.url).searchParams.get("page");
          pages.push(page);
          return HttpResponse.json({
            ...DEFAULT_INSIGHTS_OUTLIERS,
            items:
              page === "2"
                ? [{ ...DEFAULT_INSIGHTS_OUTLIERS.items[1], id: 30, fullName: "Page Two Person" }]
                : DEFAULT_INSIGHTS_OUTLIERS.items,
            total: 21,
            page: Number(page),
          });
        }),
      );

      renderPage();
      const section = await outliersSection();
      await within(section).findByText("Grace Hopper");

      expect(within(section).getByText("1–20 of 21")).toBeInTheDocument();
      fireEvent.click(within(section).getByRole("button", { name: /next page/i }));

      expect(await within(section).findByText("Page Two Person")).toBeInTheDocument();
      expect(within(section).getByText("21–21 of 21")).toBeInTheDocument();
      expect(pages).toEqual(["1", "2"]);
    });

    it("says so when nobody is outside their pay band", async () => {
      server.use(
        http.get("/api/insights/outliers", () =>
          HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20 }),
        ),
      );

      renderPage();
      const section = await outliersSection();

      expect(
        await within(section).findByText("No active employees are outside their pay band."),
      ).toBeInTheDocument();
    });

    it("is linked from the Outside pay band tile", async () => {
      renderPage();
      const summary = await screen.findByRole("region", { name: "Summary" });

      const link = await within(summary).findByRole("link", {
        name: "View list of employees outside their pay band",
      });
      expect(link).toHaveAttribute("href", "#outliers");
      expect(link).toHaveTextContent("View list");

      const section = await outliersSection();
      expect(section).toHaveAttribute("id", "outliers");
      expect(section).toHaveAttribute("tabindex", "-1");
    });
  });

  it("marks a section as busy while it loads", async () => {
    server.use(http.get("/api/insights/summary", () => new Promise(() => {})));

    renderPage();

    const summary = await screen.findByRole("region", { name: "Summary" });
    expect(summary).toHaveAttribute("aria-busy", "true");
  });
});
