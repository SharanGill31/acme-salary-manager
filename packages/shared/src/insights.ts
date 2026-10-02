import { z } from "zod";

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
