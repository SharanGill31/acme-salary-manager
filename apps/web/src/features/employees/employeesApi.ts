import type {
  EmployeeDetailResponse,
  EmployeeListItem,
  EmployeeListResponse,
  RecordSalaryChangeResponse,
  UpdateEmployeeInput,
} from "shared";
import { api } from "../../lib/api";

// Wire shape of the POST body. effective_date is sent as an ISO date string
// ("YYYY-MM-DD"); the shared schema coerces it to a Date on the server.
export interface SalaryChangeRequest {
  new_amount_minor: number;
  currency: string;
  effective_date: string;
  reason: string;
}

export function fetchEmployees(params: URLSearchParams): Promise<EmployeeListResponse> {
  const query = params.toString();
  return api.get<EmployeeListResponse>(`/employees${query ? `?${query}` : ""}`);
}

export function fetchEmployee(id: number): Promise<EmployeeDetailResponse> {
  return api.get<EmployeeDetailResponse>(`/employees/${id}`);
}

export function updateEmployee(id: number, patch: UpdateEmployeeInput): Promise<EmployeeListItem> {
  return api.patch<EmployeeListItem>(`/employees/${id}`, patch);
}

export function recordSalaryChange(
  id: number,
  body: SalaryChangeRequest,
): Promise<RecordSalaryChangeResponse> {
  return api.post<RecordSalaryChangeResponse>(`/employees/${id}/salary-changes`, body);
}
