import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import type { EmployeeListItem, RecordSalaryChangeResponse } from "shared";
import { ApiError } from "../../lib/api";
import { applyServerErrors } from "../../lib/applyServerErrors";
import { currencyMinorDigits, formatCurrency, parseMoneyToMinor } from "../../lib/money";
import { recordSalaryChange } from "./employeesApi";

interface FormValues {
  amount: string;
  effectiveDate: string;
  reason: string;
}

// The API reports 422 errors with camelCase domain keys and 400 errors with
// the snake_case body keys; both map onto the same form fields. Currency is
// fixed to the employee's, so a currency error is shown on the amount.
const SERVER_FIELD_MAP: Record<string, keyof FormValues> = {
  newAmountMinor: "amount",
  new_amount_minor: "amount",
  currency: "amount",
  effectiveDate: "effectiveDate",
  effective_date: "effectiveDate",
  reason: "reason",
};

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function amountExample(currency: string): string {
  const digits = currencyMinorDigits(currency);
  return digits === 0 ? "95,000" : `95,000.${"0".repeat(digits)}`;
}

interface SalaryChangeFormProps {
  employee: EmployeeListItem;
  onCancel: () => void;
  onSaved: (response: RecordSalaryChangeResponse) => void;
  onPendingChange: (pending: boolean) => void;
}

function SalaryChangeForm({ employee, onCancel, onSaved, onPendingChange }: SalaryChangeFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  // Fixed when the dialog opens. After saving, the profile cache updates
  // while the dialog is still fading out; reading the live salary would
  // flip the hint to the new amount mid-close.
  const [currentSalary] = useState(() =>
    formatCurrency(employee.salaryMinor, employee.currency),
  );
  const { control, handleSubmit, setError } = useForm<FormValues>({
    defaultValues: { amount: "", effectiveDate: todayIsoDate(), reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      recordSalaryChange(employee.id, {
        new_amount_minor: parseMoneyToMinor(values.amount, employee.currency) as number,
        currency: employee.currency,
        effective_date: values.effectiveDate,
        reason: values.reason.trim(),
      }),
    onMutate: () => {
      setFormError(null);
      onPendingChange(true);
    },
    onSettled: () => onPendingChange(false),
    onSuccess: onSaved,
    onError: (error) => {
      const mapped =
        error instanceof ApiError &&
        (error.status === 400 || error.status === 422) &&
        error.errors &&
        applyServerErrors(error.errors, SERVER_FIELD_MAP, setError);
      if (!mapped) {
        setFormError("Could not save the salary change. Please try again.");
      }
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}

          <Controller
            name="amount"
            control={control}
            rules={{
              required: "Enter the new salary",
              validate: (value) =>
                parseMoneyToMinor(value, employee.currency) !== null ||
                `Enter an amount like ${amountExample(employee.currency)}`,
            }}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="New annual salary"
                required
                autoFocus
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? `Current salary: ${currentSalary}`}
                slotProps={{
                  htmlInput: { inputMode: "decimal", autoComplete: "off" },
                  input: {
                    endAdornment: <InputAdornment position="end">{employee.currency}</InputAdornment>,
                  },
                }}
              />
            )}
          />

          <Controller
            name="effectiveDate"
            control={control}
            rules={{ required: "Enter the effective date" }}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Effective date"
                type="date"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />

          <Controller
            name="reason"
            control={control}
            rules={{ validate: (value) => value.trim().length > 0 || "Enter a reason" }}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                label="Reason"
                required
                multiline
                minRows={2}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? "For example: annual review, promotion"}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </form>
  );
}

interface SalaryChangeDialogProps {
  open: boolean;
  employee: EmployeeListItem;
  onClose: () => void;
  onSaved: (response: RecordSalaryChangeResponse) => void;
}

export function SalaryChangeDialog({ open, employee, onClose, onSaved }: SalaryChangeDialogProps) {
  const [pending, setPending] = useState(false);

  function handleClose() {
    if (!pending) onClose();
  }

  // The form is a child of Dialog, so it unmounts when the dialog closes and
  // every opening starts with a fresh form.
  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby="salary-change-title" fullWidth maxWidth="sm">
      <DialogTitle id="salary-change-title">Change salary</DialogTitle>
      <SalaryChangeForm
        employee={employee}
        onCancel={handleClose}
        onSaved={onSaved}
        onPendingChange={setPending}
      />
    </Dialog>
  );
}
