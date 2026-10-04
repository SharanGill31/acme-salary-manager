import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import {
  DEFAULT_INSIGHTS_BY_COUNTRY,
  DEFAULT_INSIGHTS_BY_DEPARTMENT,
  DEFAULT_INSIGHTS_BY_LEVEL_USD,
  DEFAULT_INSIGHTS_OUTLIERS,
  DEFAULT_INSIGHTS_SUMMARY,
} from "../../mocks/handlers";
import { ApiError } from "../../lib/api";
import {
  fetchInsightsByCountry,
  fetchInsightsByDepartment,
  fetchInsightsByLevel,
  fetchInsightsOutliers,
  fetchInsightsSummary,
  insightsKeys,
} from "./insightsApi";

describe("insights API client", () => {
  it("fetches the summary, country and department breakdowns", async () => {
    expect(await fetchInsightsSummary()).toEqual(DEFAULT_INSIGHTS_SUMMARY);
    expect(await fetchInsightsByCountry()).toEqual(DEFAULT_INSIGHTS_BY_COUNTRY);
    expect(await fetchInsightsByDepartment()).toEqual(DEFAULT_INSIGHTS_BY_DEPARTMENT);
  });

  it("fetches salary by level in USD when no country is given", async () => {
    let query: string | undefined;
    server.use(
      http.get("/api/insights/by-level", ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json(DEFAULT_INSIGHTS_BY_LEVEL_USD);
      }),
    );

    expect(await fetchInsightsByLevel()).toEqual(DEFAULT_INSIGHTS_BY_LEVEL_USD);
    expect(query).toBe("");
  });

  it("passes the country code for salary by level in local currency", async () => {
    let countryCode: string | null = null;
    server.use(
      http.get("/api/insights/by-level", ({ request }) => {
        countryCode = new URL(request.url).searchParams.get("countryCode");
        return HttpResponse.json({ ...DEFAULT_INSIGHTS_BY_LEVEL_USD, currency: "GBP" });
      }),
    );

    const result = await fetchInsightsByLevel("GB");

    expect(countryCode).toBe("GB");
    expect(result.currency).toBe("GBP");
  });

  it("requests the given page of employees outside their pay band", async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get("/api/insights/outliers", ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json(DEFAULT_INSIGHTS_OUTLIERS);
      }),
    );

    expect(await fetchInsightsOutliers(3, 20)).toEqual(DEFAULT_INSIGHTS_OUTLIERS);
    expect(params?.get("page")).toBe("3");
    expect(params?.get("pageSize")).toBe("20");
  });

  it("surfaces a failed request as an ApiError", async () => {
    server.use(
      http.get("/api/insights/summary", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
      ),
    );

    await expect(fetchInsightsSummary()).rejects.toMatchObject({
      constructor: ApiError,
      status: 500,
    });
  });

  it("keys every insights query under the 'insights' prefix that employee changes refresh", () => {
    const keys = [
      insightsKeys.summary(),
      insightsKeys.byCountry(),
      insightsKeys.byDepartment(),
      insightsKeys.byLevel(),
      insightsKeys.byLevel("GB"),
      insightsKeys.outliers(2, 20),
    ];

    for (const key of keys) expect(key[0]).toBe("insights");
    expect(insightsKeys.byLevel("GB")).not.toEqual(insightsKeys.byLevel());
    expect(insightsKeys.outliers(2, 20)).not.toEqual(insightsKeys.outliers(1, 20));
  });
});
