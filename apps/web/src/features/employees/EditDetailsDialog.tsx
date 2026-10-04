import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  LEVELS,
  updateEmployeeSchema,
  type EmployeeListItem,
  type UpdateEmployeeInput,
} from "shared";
import { ApiError } from "../../lib/api";
import { applyServerErrors } from "../../lib/applyServerErrors";
import { useMetaQuery } from "../../lib/useMetaQuery";
import { updateEmployee } from "./employeesApi";

// The form is typed by the shared PATCH schema itself, so field names match
// the API's snake_case body and 400 fieldErrors map 1:1. Salary and currency
// are deliberately absent: they only change through the salary change
// dialog (and the PATCH schema doesn't accept them).
type FormValues = UpdateEmployeeInput;

const SERVER_FIELD_MAP: Record<string, keyof FormValues> = {
  full_name: "full_name",
  email: "email",
  job_title: "job_title",
  department_id: "department_id",
  level: "level",
};

interface EditDetailsFormProps {
  employee: EmployeeListItem;
  onCancel: () => void;
  onSaved: () => void;
  onPendingChange: (pending: boolean) => void;
}

function EditDetailsForm({ employee, onCancel, onSaved, onPendingChange }: EditDetailsFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const metaQuery = useMetaQuery();
  const departments = metaQuery.data?.departments ?? [
    { id: employee.departmentId, name: employee.departmentName },
  ];

  const {
    control,
    handleSubmit,
    setError,
    formState: { isDirty, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      full_name: employee.fullName,
      email: employee.email,
      job_title: employee.jobTitle,
      department_id: employee.departmentId,
      level: employee.level,
    },
  });

  const mutation = useMutation({
    mutationFn: (patch: FormValues) => updateEmployee(employee.id, patch),
    onMutate: () => {
      setFormError(null);
      onPendingChange(true);
    },
    onSettled: () => onPendingChange(false),
    onSuccess: onSaved,
    onError: (error) => {
      // 400s carry schema errors and 409s name the conflicting field (e.g.
      // email); both arrive as ApiError.errors keyed by body field.
      const mapped =
        error instanceof ApiError &&
        (error.status === 400 || error.status === 409) &&
        error.errors &&
        applyServerErrors(error.errors, SERVER_FIELD_MAP, setError);
      if (!mapped) {
        setFormError("Could not save the changes. Please try again.");
      }
    },
  });

  function submit(values: FormValues) {
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(dirtyFields) as (keyof FormValues)[]) {
      patch[key] = values[key];
    }
    mutation.mutate(patch as FormValues);
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Employee code, country and hire date can't be changed. To change the salary, use Change
          salary.
        </DialogContentText>
        <Stack spacing={3}>
          {formError && <Alert severity="error">{formError}</Alert>}

          <Controller
            name="full_name"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                label="Full name"
                required
                autoFocus
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                label="Email"
                type="email"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="job_title"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                label="Job title"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="department_id"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                onChange={(event) => field.onChange(Number(event.target.value))}
                select
                label="Department"
                required
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ select: { native: true } }}
              >
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="level"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                select
                label="Level"
                required
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ??
                  "Changing level moves the employee to that level's pay band."
                }
                slotProps={{ select: { native: true } }}
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </TextField>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </form>
  );
}

interface EditDetailsDialogProps {
  open: boolean;
  employee: EmployeeListItem;
  onClose: () => void;
  onSaved: () => void;
}

export function EditDetailsDialog({ open, employee, onClose, onSaved }: EditDetailsDialogProps) {
  const [pending, setPending] = useState(false);

  function handleClose() {
    if (!pending) onClose();
  }

  // As with the salary dialog, the form unmounts on close so each opening
  // starts from the employee's current details.
  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby="edit-details-title" fullWidth maxWidth="sm">
      <DialogTitle id="edit-details-title">Edit details</DialogTitle>
      <EditDetailsForm
        employee={employee}
        onCancel={handleClose}
        onSaved={onSaved}
        onPendingChange={setPending}
      />
    </Dialog>
  );
}
