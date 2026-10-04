import type { QueryClient } from "@tanstack/react-query";

// Any change to an employee (salary, details, status, a new hire) can move
// both the directory and the insights, so every such change refreshes both.
// Keys are prefixes: ["insights"] covers every insights query.
export function refreshEmployeeData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["employees"] });
  void queryClient.invalidateQueries({ queryKey: ["insights"] });
}
