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
