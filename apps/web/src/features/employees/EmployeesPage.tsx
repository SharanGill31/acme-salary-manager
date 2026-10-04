import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  Paper,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { EMPLOYEE_STATUSES, type EmployeeSortColumn } from "shared";
import { fetchEmployees } from "./employeesApi";
import { formatCurrency } from "../../lib/money";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useMetaQuery } from "../../lib/useMetaQuery";

const DEFAULT_SORT_BY: EmployeeSortColumn = "full_name";
const DEFAULT_SORT_DIR = "asc";
const PAGE_SIZE = 20;

interface Column {
  key: EmployeeSortColumn | "departmentName";
  label: string;
  sortable: boolean;
}

const COLUMNS: Column[] = [
  { key: "employee_code", label: "Employee code", sortable: true },
  { key: "full_name", label: "Full name", sortable: true },
  { key: "country_code", label: "Country", sortable: true },
  { key: "departmentName", label: "Department", sortable: false },
  { key: "level", label: "Level", sortable: true },
  { key: "salary_minor", label: "Current salary", sortable: true },
  { key: "status", label: "Status", sortable: true },
];

interface ParsedQuery {
  search: string;
  countryCode: string;
  departmentId: string;
  level: string;
  status: string;
  sortBy: EmployeeSortColumn;
  sortDir: "asc" | "desc";
  page: number;
}

function parseParams(params: URLSearchParams): ParsedQuery {
  return {
    search: params.get("search") ?? "",
    countryCode: params.get("countryCode") ?? "",
    departmentId: params.get("departmentId") ?? "",
    level: params.get("level") ?? "",
    status: params.get("status") ?? "",
    sortBy: (params.get("sortBy") as EmployeeSortColumn | null) || DEFAULT_SORT_BY,
    sortDir: (params.get("sortDir") as "asc" | "desc" | null) || DEFAULT_SORT_DIR,
    page: Number(params.get("page") ?? "1") || 1,
  };
}

// Search, filters and sort: shared by the list request and the CSV export,
// so the export always contains exactly what the list shows (across all pages).
function buildFilterParams(query: ParsedQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.countryCode) params.set("countryCode", query.countryCode);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  if (query.level) params.set("level", query.level);
  if (query.status) params.set("status", query.status);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);
  return params;
}

function buildApiParams(query: ParsedQuery): URLSearchParams {
  const apiParams = buildFilterParams(query);
  apiParams.set("page", String(query.page));
  apiParams.set("pageSize", String(PAGE_SIZE));
  return apiParams;
}

// A plain link: the server sends the file as an attachment, so the browser
// downloads it and the rows never pass through the app.
function buildExportHref(query: ParsedQuery): string {
  return `/api/employees/export?${buildFilterParams(query)}`;
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseParams(searchParams);

  const [searchInput, setSearchInput] = useState(query.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const isFirstDebounce = useRef(true);

  const metaQuery = useMetaQuery();

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>, options: { resetPage?: boolean } = {}) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (options.resetPage !== false) next.set("page", "1");
        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (isFirstDebounce.current) {
      isFirstDebounce.current = false;
      return;
    }
    updateParams({ search: debouncedSearch || undefined });
  }, [debouncedSearch, updateParams]);

  const apiParams = buildApiParams(query);

  const employeesQuery = useQuery({
    queryKey: ["employees", apiParams.toString()],
    queryFn: () => fetchEmployees(apiParams),
    placeholderData: keepPreviousData,
  });

  function handleSort(column: EmployeeSortColumn) {
    const nextDir = query.sortBy === column && query.sortDir === "asc" ? "desc" : "asc";
    updateParams({ sortBy: column, sortDir: nextDir });
  }

  function goToEmployee(id: number) {
    navigate(`/employees/${id}`);
  }

  const data = employeesQuery.data;
  const items = data?.items ?? [];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Employees
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button component="a" href={buildExportHref(query)} download variant="outlined">
            Export CSV
          </Button>
          <Button component={RouterLink} to="/employees/new" variant="contained">
            Add employee
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <TextField
          label="Search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ minWidth: 220 }}
        />

        {/* Each filter's empty value is a real "All …" option with text, so the
            label must always float (shrink, with a notched outline); MUI would
            otherwise draw it over that text because the value is "". */}
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel htmlFor="country-filter" shrink>Country</InputLabel>
          <Select
            native
            id="country-filter"
            notched
            label="Country"
            value={query.countryCode}
            onChange={(event) => updateParams({ countryCode: event.target.value || undefined })}
          >
            <option value="">All countries</option>
            {metaQuery.data?.countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel htmlFor="department-filter" shrink>Department</InputLabel>
          <Select
            native
            id="department-filter"
            notched
            label="Department"
            value={query.departmentId}
            onChange={(event) => updateParams({ departmentId: event.target.value || undefined })}
          >
            <option value="">All departments</option>
            {metaQuery.data?.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel htmlFor="level-filter" shrink>Level</InputLabel>
          <Select
            native
            id="level-filter"
            notched
            label="Level"
            value={query.level}
            onChange={(event) => updateParams({ level: event.target.value || undefined })}
          >
            <option value="">All levels</option>
            {metaQuery.data?.levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel htmlFor="status-filter" shrink>Status</InputLabel>
          <Select
            native
            id="status-filter"
            notched
            label="Status"
            value={query.status}
            onChange={(event) => updateParams({ status: event.target.value || undefined })}
          >
            <option value="">All statuses</option>
            {EMPLOYEE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </FormControl>
      </Box>

      {employeesQuery.isFetching && !employeesQuery.isPending && <LinearProgress sx={{ mb: 1 }} />}

      {employeesQuery.isError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => employeesQuery.refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load employees.
        </Alert>
      )}

      <Typography role="status" sx={{ mb: 1 }}>
        {data ? `${data.total} employee${data.total === 1 ? "" : "s"} found` : ""}
      </Typography>

      <TableContainer component={Paper}>
        <Table aria-label="Employees">
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column.key}
                  sortDirection={query.sortBy === column.key ? query.sortDir : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={query.sortBy === column.key}
                      direction={query.sortBy === column.key ? query.sortDir : "asc"}
                      onClick={() => handleSort(column.key as EmployeeSortColumn)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {employeesQuery.isPending ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {COLUMNS.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length}>No employees found</TableCell>
              </TableRow>
            ) : (
              items.map((employee) => (
                <TableRow
                  key={employee.id}
                  hover
                  tabIndex={0}
                  onClick={() => goToEmployee(employee.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      goToEmployee(employee.id);
                    }
                  }}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{employee.employeeCode}</TableCell>
                  <TableCell>{employee.fullName}</TableCell>
                  <TableCell>{employee.countryCode}</TableCell>
                  <TableCell>{employee.departmentName}</TableCell>
                  <TableCell>{employee.level}</TableCell>
                  <TableCell>{formatCurrency(employee.salaryMinor, employee.currency)}</TableCell>
                  <TableCell>{employee.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={data?.total ?? query.page * PAGE_SIZE}
        page={query.page - 1}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
        onPageChange={(_event, newPageIndex) =>
          updateParams({ page: String(newPageIndex + 1) }, { resetPage: false })
        }
      />
    </Box>
  );
}
