import { z } from "zod";

export const LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;
export const EMPLOYEE_STATUSES = ["active", "inactive"] as const;

export const EMPLOYEE_SORT_COLUMNS = [
  "full_name",
  "employee_code",
  "country_code",
  "level",
  "status",
  "hire_date",
  "salary_minor",
] as const;

export type Level = (typeof LEVELS)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
export type EmployeeSortColumn = (typeof EMPLOYEE_SORT_COLUMNS)[number];

export const employeeListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/, "countryCode must be two uppercase letters")
    .optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  level: z.enum(LEVELS).optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  sortBy: z.enum(EMPLOYEE_SORT_COLUMNS).default("full_name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

export const employeeListItemSchema = z.object({
  id: z.number(),
  employeeCode: z.string(),
  fullName: z.string(),
  email: z.string(),
  countryCode: z.string(),
  departmentId: z.number(),
  departmentName: z.string(),
  jobTitle: z.string(),
  level: z.enum(LEVELS),
  status: z.enum(EMPLOYEE_STATUSES),
  hireDate: z.string(),
  salaryMinor: z.string(),
  currency: z.string(),
});

export type EmployeeListItem = z.infer<typeof employeeListItemSchema>;

export const employeeListResponseSchema = z.object({
  items: z.array(employeeListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;

export const createEmployeeSchema = z.object({
  full_name: z.string().trim().min(1),
  email: z.string().email(),
  employee_code: z.string().trim().min(1),
  country_code: z
    .string()
    .regex(/^[A-Z]{2}$/, "country_code must be two uppercase letters"),
  department_id: z.number().int().positive(),
  job_title: z.string().trim().min(1),
  level: z.enum(LEVELS),
  hire_date: z.coerce.date(),
  salary_minor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/, "currency must be three uppercase letters"),
  status: z.enum(EMPLOYEE_STATUSES),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    department_id: z.number().int().positive().optional(),
    job_title: z.string().trim().min(1).optional(),
    level: z.enum(LEVELS).optional(),
    status: z.enum(EMPLOYEE_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const salaryChangeItemSchema = z.object({
  id: z.number(),
  previousAmountMinor: z.string().nullable(),
  newAmountMinor: z.string(),
  currency: z.string(),
  effectiveDate: z.string(),
  reason: z.string(),
  createdAt: z.string(),
});

export const payBandItemSchema = z.object({
  level: z.enum(LEVELS),
  countryCode: z.string(),
  minMinor: z.string(),
  maxMinor: z.string(),
});

export const BAND_POSITIONS = ["below", "within", "above"] as const;
export type BandPosition = (typeof BAND_POSITIONS)[number];

export const employeeDetailResponseSchema = z.object({
  employee: employeeListItemSchema,
  salaryHistory: z.array(salaryChangeItemSchema),
  payBand: payBandItemSchema,
  bandPosition: z.enum(BAND_POSITIONS),
  compaRatio: z.number(),
});

export type EmployeeDetailResponse = z.infer<typeof employeeDetailResponseSchema>;

// Structural checks only (shape/type) — 400. Business rules (positivity,
// currency match, date range, reason length) live in validateSalaryChange
// and surface as 422, not here.
export const recordSalaryChangeSchema = z.object({
  new_amount_minor: z.number().int(),
  currency: z.string().regex(/^[A-Z]{3}$/, "currency must be three uppercase letters"),
  effective_date: z.coerce.date(),
  reason: z.string(),
});

export type RecordSalaryChangeBody = z.infer<typeof recordSalaryChangeSchema>;

export const recordSalaryChangeResponseSchema = employeeDetailResponseSchema.extend({
  warnings: z.array(z.string()),
});

export type RecordSalaryChangeResponse = z.infer<typeof recordSalaryChangeResponseSchema>;
