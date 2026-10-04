import type { EmployeeListResponse } from "shared";
import { api } from "../../lib/api";

export function fetchEmployees(params: URLSearchParams): Promise<EmployeeListResponse> {
  const query = params.toString();
  return api.get<EmployeeListResponse>(`/employees${query ? `?${query}` : ""}`);
}
