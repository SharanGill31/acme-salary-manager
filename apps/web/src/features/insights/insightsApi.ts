import type {
  InsightsByCountryResponse,
  InsightsByDepartmentResponse,
  InsightsByLevelResponse,
  InsightsOutliersResponse,
  InsightsSummaryResponse,
} from "shared";
import { api } from "../../lib/api";

// Every insights query key starts with "insights", the prefix that
// refreshEmployeeData invalidates after any employee change.
export const insightsKeys = {
  summary: () => ["insights", "summary"] as const,
  byCountry: () => ["insights", "by-country"] as const,
  byDepartment: () => ["insights", "by-department"] as const,
  byLevel: (countryCode?: string) => ["insights", "by-level", countryCode ?? "all"] as const,
  outliers: (page: number, pageSize: number) => ["insights", "outliers", page, pageSize] as const,
};

export function fetchInsightsSummary(): Promise<InsightsSummaryResponse> {
  return api.get<InsightsSummaryResponse>("/insights/summary");
}

export function fetchInsightsByCountry(): Promise<InsightsByCountryResponse> {
  return api.get<InsightsByCountryResponse>("/insights/by-country");
}

export function fetchInsightsByDepartment(): Promise<InsightsByDepartmentResponse> {
  return api.get<InsightsByDepartmentResponse>("/insights/by-department");
}

// Without a country, amounts are in USD; with one, in that country's currency.
export function fetchInsightsByLevel(countryCode?: string): Promise<InsightsByLevelResponse> {
  const query = countryCode ? `?${new URLSearchParams({ countryCode })}` : "";
  return api.get<InsightsByLevelResponse>(`/insights/by-level${query}`);
}

export function fetchInsightsOutliers(
  page: number,
  pageSize: number,
): Promise<InsightsOutliersResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return api.get<InsightsOutliersResponse>(`/insights/outliers?${query}`);
}
