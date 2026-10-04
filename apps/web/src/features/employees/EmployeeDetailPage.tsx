import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmployeeListItem, EmployeeStatus, RecordSalaryChangeResponse } from "shared";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/money";
import { formatDate } from "../../lib/formatDate";
import { fetchEmployee } from "./employeesApi";
import { PayBandCard } from "./PayBandCard";
import { SalaryHistoryTable } from "./SalaryHistoryTable";
import { SalaryChangeDialog } from "./SalaryChangeDialog";
import { EditDetailsDialog } from "./EditDetailsDialog";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { statusActionLabel } from "./employeeStatus";

interface Notice {
  severity: "success" | "warning";
  message: string;
}

function parseId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function BackLink() {
  return (
    <Link component={RouterLink} to="/employees" sx={{ display: "inline-block", mb: 2 }}>
      ← Back to employees
    </Link>
  );
}

function NotFound() {
  return (
    <Box>
      <BackLink />
      <Typography variant="h4" component="h1" gutterBottom>
        Employee not found
      </Typography>
      <Typography>No employee exists with this ID. It may have been removed or the link is wrong.</Typography>
    </Box>
  );
}

function EmployeeDetails({ employee }: { employee: EmployeeListItem }) {
  const rows: [string, string][] = [
    ["Employee code", employee.employeeCode],
    ["Email", employee.email],
    ["Job title", employee.jobTitle],
    ["Department", employee.departmentName],
    ["Level", employee.level],
    ["Country", employee.countryCode],
    ["Status", employee.status === "active" ? "Active" : "Inactive"],
    ["Hire date", formatDate(employee.hireDate)],
    ["Current salary", formatCurrency(employee.salaryMinor, employee.currency)],
  ];

  return (
    <Paper component="section" aria-labelledby="details-heading" sx={{ p: 3 }}>
      <Typography id="details-heading" variant="h6" component="h2" sx={{ mb: 2 }}>
        Details
      </Typography>
      <Box
        component="dl"
        sx={{ m: 0, display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 3, rowGap: 1 }}
      >
        {rows.map(([term, value]) => (
          <Box key={term} sx={{ display: "contents" }}>
            <Typography component="dt" color="text.secondary">
              {term}
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export function EmployeeDetailPage() {
  const id = parseId(useParams().id);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState<"salary" | "edit" | "status" | null>(null);
  // A page that navigates here (e.g. after adding an employee) can pass a
  // confirmation message in the navigation state.
  const [notice, setNotice] = useState<Notice | null>(() => {
    const message = (location.state as { notice?: string } | null)?.notice;
    return message ? { severity: "success", message } : null;
  });

  // Drop the navigation state once read, so a page refresh doesn't repeat
  // the confirmation.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const employeeQuery = useQuery({
    queryKey: ["employee", id],
    queryFn: () => fetchEmployee(id as number),
    enabled: id !== null,
  });

  function handleSalarySaved({ warnings, ...detail }: RecordSalaryChangeResponse) {
    queryClient.setQueryData(["employee", id], detail);
    void queryClient.invalidateQueries({ queryKey: ["employees"] });
    setOpenDialog(null);
    setNotice(
      warnings.length > 0
        ? { severity: "warning", message: `Salary change recorded. ${warnings.join(" ")}` }
        : { severity: "success", message: "Salary change recorded" },
    );
  }

  // PATCH returns only the employee row, and a level change moves the pay
  // band and compa-ratio, so refetch the full profile rather than patching
  // the cache.
  function handleDetailsSaved() {
    void queryClient.invalidateQueries({ queryKey: ["employee", id] });
    void queryClient.invalidateQueries({ queryKey: ["employees"] });
    setOpenDialog(null);
    setNotice({ severity: "success", message: "Details updated" });
  }

  function handleStatusSaved(fullName: string, status: EmployeeStatus) {
    void queryClient.invalidateQueries({ queryKey: ["employee", id] });
    void queryClient.invalidateQueries({ queryKey: ["employees"] });
    setOpenDialog(null);
    setNotice({ severity: "success", message: `${fullName} marked as ${status}` });
  }

  if (id === null) return <NotFound />;

  if (employeeQuery.isError) {
    if (employeeQuery.error instanceof ApiError && employeeQuery.error.status === 404) {
      return <NotFound />;
    }
    return (
      <Box>
        <BackLink />
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => employeeQuery.refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load employee.
        </Alert>
      </Box>
    );
  }

  if (employeeQuery.isPending) {
    return (
      <Box aria-busy="true">
        <BackLink />
        <Typography role="status" sx={{ mb: 2 }}>
          Loading employee…
        </Typography>
        <Skeleton variant="text" width={320} height={48} />
        <Skeleton variant="rectangular" height={240} sx={{ mt: 2 }} />
      </Box>
    );
  }

  const detail = employeeQuery.data;
  const { employee } = detail;

  return (
    <Box>
      <BackLink />
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5, flexWrap: "wrap" }}>
        <Typography variant="h4" component="h1">
          {employee.fullName}
        </Typography>
        {employee.status === "inactive" && <Chip label="Inactive" size="small" />}
        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
          <Button variant="outlined" onClick={() => setOpenDialog("status")}>
            {statusActionLabel(employee)}
          </Button>
          <Button variant="outlined" onClick={() => setOpenDialog("edit")}>
            Edit details
          </Button>
          <Button variant="contained" onClick={() => setOpenDialog("salary")}>
            Change salary
          </Button>
        </Stack>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {employee.jobTitle} · {employee.departmentName}
      </Typography>

      <Stack spacing={3}>
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <EmployeeDetails employee={employee} />
          <PayBandCard detail={detail} />
        </Box>
        <SalaryHistoryTable history={detail.salaryHistory} />
      </Stack>

      <SalaryChangeDialog
        open={openDialog === "salary"}
        employee={employee}
        onClose={() => setOpenDialog(null)}
        onSaved={handleSalarySaved}
      />

      <EditDetailsDialog
        open={openDialog === "edit"}
        employee={employee}
        onClose={() => setOpenDialog(null)}
        onSaved={handleDetailsSaved}
      />

      <StatusChangeDialog
        open={openDialog === "status"}
        employee={employee}
        onClose={() => setOpenDialog(null)}
        onSaved={(status) => handleStatusSaved(employee.fullName, status)}
      />

      {notice && (
        <Snackbar
          open
          // Warnings stay until dismissed so they can't be missed.
          autoHideDuration={notice.severity === "warning" ? null : 6000}
          onClose={(_event, reason) => {
            if (reason !== "clickaway") setNotice(null);
          }}
        >
          <Alert severity={notice.severity} onClose={() => setNotice(null)} variant="filled">
            {notice.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
