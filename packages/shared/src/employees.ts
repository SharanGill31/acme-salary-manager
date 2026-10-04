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

// The CSV export takes the list's search, filters and sort but never pages:
// it always contains every matching employee. page/pageSize are dropped.
export const employeeExportQuerySchema = employeeListQuerySchema.omit({
  page: true,
  pageSize: true,
});

export type EmployeeExportQuery = z.infer<typeof employeeExportQuerySchema>;

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

// Each employee field's rules, defined once and shared by the create and
// update schemas. Messages are shown to the HR user as-is (the add and edit
// forms validate with these schemas), so they are written in plain language.
// Passing the message as `error` too means a missing or wrong-type value gets
// the same message as an invalid one.
function requiredText(message: string) {
  return z.string({ error: message }).trim().min(1, message);
}

function positiveInt(message: string) {
  return z.number({ error: message }).int(message).positive(message);
}

const VALID_EMAIL = "Enter a valid email address";
const CHOOSE_COUNTRY = "Choose a country";

const employeeFields = {
  full_name: requiredText("Enter a full name"),
  email: z.string({ error: VALID_EMAIL }).email(VALID_EMAIL),
  employee_code: requiredText("Enter an employee code"),
  country_code: z.string({ error: CHOOSE_COUNTRY }).regex(/^[A-Z]{2}$/, CHOOSE_COUNTRY),
  department_id: positiveInt("Choose a department"),
  job_title: requiredText("Enter a job title"),
  level: z.enum(LEVELS, { error: "Choose a level" }),
  hire_date: z.coerce.date({ error: "Enter a hire date" }),
  salary_minor: positiveInt("Enter a salary greater than zero"),
  currency: z.string().regex(/^[A-Z]{3}$/, "currency must be three uppercase letters"),
  status: z.enum(EMPLOYEE_STATUSES),
};

export const createEmployeeSchema = z.object(employeeFields);

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    full_name: employeeFields.full_name,
    email: employeeFields.email,
    department_id: employeeFields.department_id,
    job_title: employeeFields.job_title,
    level: employeeFields.level,
    status: employeeFields.status,
  })
  .partial()
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
