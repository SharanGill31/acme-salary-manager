import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import type { EmployeeListItem, EmployeeStatus } from "shared";
import { updateEmployee } from "./employeesApi";
import { STATUS_CHANGE_COPY, targetStatus } from "./employeeStatus";

interface StatusChangeContentProps {
  employee: EmployeeListItem;
  onCancel: () => void;
  onSaved: (status: EmployeeStatus) => void;
  onPendingChange: (pending: boolean) => void;
}

function StatusChangeContent({ employee, onCancel, onSaved, onPendingChange }: StatusChangeContentProps) {
  // Fixed when the dialog opens. After saving, the profile refetches while
  // the dialog is still fading out; reading the live status would flip the
  // wording to the opposite action mid-close.
  const [target] = useState(() => targetStatus(employee));
  const [error, setError] = useState<string | null>(null);
  const copy = STATUS_CHANGE_COPY[target];

  const mutation = useMutation({
    mutationFn: () => updateEmployee(employee.id, { status: target }),
    onMutate: () => {
      setError(null);
      onPendingChange(true);
    },
    onSettled: () => onPendingChange(false),
    onSuccess: () => onSaved(target),
    onError: () => setError("Could not update the status. Please try again."),
  });

  return (
    <>
      <DialogTitle id="status-change-title">{`Mark ${employee.fullName} as ${target}?`}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText id="status-change-description">{copy.description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={mutation.isPending} autoFocus>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : copy.action}
        </Button>
      </DialogActions>
    </>
  );
}

interface StatusChangeDialogProps {
  open: boolean;
  employee: EmployeeListItem;
  onClose: () => void;
  onSaved: (status: EmployeeStatus) => void;
}

// One confirmation dialog for both directions; the target is whichever
// status the employee doesn't have when the dialog opens.
export function StatusChangeDialog({ open, employee, onClose, onSaved }: StatusChangeDialogProps) {
  const [pending, setPending] = useState(false);

  function handleClose() {
    if (!pending) onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="status-change-title"
      aria-describedby="status-change-description"
      fullWidth
      maxWidth="xs"
    >
      <StatusChangeContent
        employee={employee}
        onCancel={handleClose}
        onSaved={onSaved}
        onPendingChange={setPending}
      />
    </Dialog>
  );
}
