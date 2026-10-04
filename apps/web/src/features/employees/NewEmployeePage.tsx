import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Controller, useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { COUNTRY_CURRENCIES, LEVELS, createEmployeeSchema } from "shared";
import { ApiError } from "../../lib/api";
import { applyServerErrors } from "../../lib/applyServerErrors";
import { currencyMinorDigits, parseMoneyToMinor } from "../../lib/money";
import { useMetaQuery } from "../../lib/useMetaQuery";
import { createEmployee } from "./employeesApi";
import { refreshEmployeeData } from "./refreshEmployeeData";

// Field names match the API's snake_case body so server errors map 1:1,
// except the salary, which is typed as text and sent as salary_minor.
// Selects start empty ("") so the shared schema's "Choose a …" messages apply.
interface FormValues {
  full_name: string;
  email: string;
  employee_code: string;
  country_code: string;
  department_id: number | "";
  job_title: string;
  level: string;
  hire_date: string;
  salary: string;
}

const SERVER_FIELD_MAP: Record<string, keyof FormValues> = {
  full_name: "full_name",
  email: "email",
  employee_code: "employee_code",
  country_code: "country_code",
  // Currency is derived from the country, so a currency error is the country's.
  currency: "country_code",
  department_id: "department_id",
  job_title: "job_title",
  level: "level",
  hire_date: "hire_date",
  salary_minor: "salary",
};

const SALARY_GREATER_THAN_ZERO = "Enter a salary greater than zero";

const regionNames = new Intl.DisplayNames("en", { type: "region" });

function currencyFor(countryCode: string): string | undefined {
  return COUNTRY_CURRENCIES.find((entry) => entry.countryCode === countryCode)?.currency;
}

function salaryError(values: FormValues): string | undefined {
  const currency = currencyFor(values.country_code);
  // Without a country the salary can't be read; the country error covers it.
  if (!currency) return undefined;

  const minor = parseMoneyToMinor(values.salary, currency);
  if (minor === null) {
    const digits = currencyMinorDigits(currency);
    return values.salary.trim() === ""
      ? SALARY_GREATER_THAN_ZERO
      : `Enter an amount like ${digits === 0 ? "95,000" : `95,000.${"0".repeat(digits)}`}`;
  }
  return minor === 0 ? SALARY_GREATER_THAN_ZERO : undefined;
}

// Every field except the salary is validated by the shared create schema
// (hire_date included: its coercion rejects an empty date). The salary is
// the one web-only check: text parsed into minor units of the country's
// currency.
const schemaResolver = zodResolver(
  createEmployeeSchema.pick({
    full_name: true,
    email: true,
    employee_code: true,
    country_code: true,
    department_id: true,
    job_title: true,
    level: true,
    hire_date: true,
  }),
) as unknown as Resolver<FormValues>;

const resolver: Resolver<FormValues> = async (values, context, options) => {
  const result = await schemaResolver(values, context, options);
  const errors: FieldErrors<FormValues> = { ...result.errors };
  const salaryMessage = salaryError(values);
  if (salaryMessage) {
    errors.salary = { type: "validate", message: salaryMessage };
  }
  return Object.keys(errors).length > 0 ? { values: {}, errors } : { values, errors: {} };
};

export function NewEmployeePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const metaQuery = useMetaQuery();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, watch } = useForm<FormValues>({
    resolver,
    defaultValues: {
      full_name: "",
      email: "",
      employee_code: "",
      country_code: "",
      department_id: "",
      job_title: "",
      level: "",
      hire_date: "",
      salary: "",
    },
  });

  const currency = currencyFor(watch("country_code"));

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const employeeCurrency = currencyFor(values.country_code) as string;
      return createEmployee({
        full_name: values.full_name,
        email: values.email,
        employee_code: values.employee_code,
        country_code: values.country_code,
        department_id: values.department_id as number,
        job_title: values.job_title,
        level: values.level as (typeof LEVELS)[number],
        hire_date: values.hire_date,
        salary_minor: parseMoneyToMinor(values.salary, employeeCurrency) as number,
        currency: employeeCurrency,
        status: "active",
      });
    },
    onMutate: () => setFormError(null),
    onSuccess: (created) => {
      refreshEmployeeData(queryClient);
      navigate(`/employees/${created.id}`, { state: { notice: "Employee added" } });
    },
    onError: (error) => {
      const mapped =
        error instanceof ApiError &&
        [400, 409, 422].includes(error.status) &&
        error.errors &&
        applyServerErrors(error.errors, SERVER_FIELD_MAP, setError);
      if (!mapped) {
        setFormError("Could not add the employee. Please try again.");
      }
    },
  });

  return (
    <Box>
      <Link component={RouterLink} to="/employees" sx={{ display: "inline-block", mb: 2 }}>
        ← Back to employees
      </Link>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Add employee
      </Typography>

      <Paper
        component="form"
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        sx={{ p: 3, maxWidth: 640 }}
      >
        <Stack spacing={3}>
          {formError && <Alert severity="error">{formError}</Alert>}

          <Controller
            name="full_name"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Full name"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Email"
                type="email"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="employee_code"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Employee code"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? "For example: EMP010001"}
              />
            )}
          />

          <Controller
            name="country_code"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                select
                label="Country"
                required
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ?? "Salary and pay band use this country's currency."
                }
                slotProps={{ select: { native: true } }}
              >
                <option value="">Choose a country</option>
                {COUNTRY_CURRENCIES.map((entry) => (
                  <option key={entry.countryCode} value={entry.countryCode}>
                    {`${regionNames.of(entry.countryCode)} (${entry.currency})`}
                  </option>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="department_id"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                onChange={(event) =>
                  field.onChange(event.target.value === "" ? "" : Number(event.target.value))
                }
                select
                label="Department"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ select: { native: true } }}
              >
                <option value="">Choose a department</option>
                {metaQuery.data?.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="job_title"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Job title"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="level"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                select
                label="Level"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ select: { native: true } }}
              >
                <option value="">Choose a level</option>
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="hire_date"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Hire date"
                type="date"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />

          <Controller
            name="salary"
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Annual salary"
                required
                disabled={!currency}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? (currency ? undefined : "Choose a country first")}
                slotProps={{
                  htmlInput: { inputMode: "decimal", autoComplete: "off" },
                  input: currency
                    ? { endAdornment: <InputAdornment position="end">{currency}</InputAdornment> }
                    : undefined,
                }}
              />
            )}
          />

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button component={RouterLink} to="/employees" disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add employee"}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
