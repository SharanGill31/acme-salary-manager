import { z } from "zod";
import { BAND_POSITIONS, LEVELS } from "./employees";

export const insightsByLevelQuerySchema = z.object({
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/, "countryCode must be two uppercase letters")
    .optional(),
});

export type InsightsByLevelQuery = z.infer<typeof insightsByLevelQuerySchema>;

export const insightsOutliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type InsightsOutliersQuery = z.infer<typeof insightsOutliersQuerySchema>;

// Money is integer minor units as a string, as everywhere else in the API.
// Cross-country figures are in USD minor units (cents).
const minorUnits = z.string().regex(/^\d+$/, "must be a non-negative integer string");

export const insightsSummaryResponseSchema = z.object({
  headcount: z.number().int(),
  totalPayrollUsdMinor: minorUnits,
  medianSalaryUsdMinor: minorUnits,
  employeesOutsideBand: z.number().int(),
});

export type InsightsSummaryResponse = z.infer<typeof insightsSummaryResponseSchema>;

const usdAggregates = {
  headcount: z.number().int(),
  totalPayrollUsdMinor: minorUnits,
  averageSalaryUsdMinor: minorUnits,
  medianSalaryUsdMinor: minorUnits,
};

export const insightsByCountryResponseSchema = z.array(
  z.object({ countryCode: z.string(), ...usdAggregates }),
);

export type InsightsByCountryResponse = z.infer<typeof insightsByCountryResponseSchema>;

export const insightsByDepartmentResponseSchema = z.array(
  z.object({ departmentId: z.number().int(), departmentName: z.string(), ...usdAggregates }),
);

export type InsightsByDepartmentResponse = z.infer<typeof insightsByDepartmentResponseSchema>;

// In USD when no country is requested, otherwise in that country's currency.
export const insightsByLevelResponseSchema = z.object({
  currency: z.string(),
  levels: z.array(
    z.object({
      level: z.enum(LEVELS),
      minSalaryMinor: minorUnits,
      medianSalaryMinor: minorUnits,
      averageSalaryMinor: minorUnits,
      maxSalaryMinor: minorUnits,
    }),
  ),
});

export type InsightsByLevelResponse = z.infer<typeof insightsByLevelResponseSchema>;

// Each outlier's amounts are in their own currency.
export const insightsOutliersResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      employeeCode: z.string(),
      fullName: z.string(),
      departmentName: z.string(),
      countryCode: z.string(),
      level: z.enum(LEVELS),
      salaryMinor: minorUnits,
      currency: z.string(),
      payBand: z.object({ minMinor: minorUnits, maxMinor: minorUnits }),
      bandPosition: z.enum(BAND_POSITIONS),
      compaRatio: z.number(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type InsightsOutliersResponse = z.infer<typeof insightsOutliersResponseSchema>;
