import type { EmployeeListItem, EmployeeStatus } from "shared";

export const STATUS_CHANGE_COPY: Record<EmployeeStatus, { action: string; description: string }> = {
  inactive: {
    action: "Mark inactive",
    description:
      "They stay in the directory and their salary history is kept. Inactive employees are not counted in insights.",
  },
  active: {
    action: "Mark active",
    description:
      "They will be counted in insights again. Their details and salary history are unchanged.",
  },
};

// The status a status change would move the employee to.
export function targetStatus(employee: EmployeeListItem): EmployeeStatus {
  return employee.status === "active" ? "inactive" : "active";
}

export function statusActionLabel(employee: EmployeeListItem): string {
  return STATUS_CHANGE_COPY[targetStatus(employee)].action;
}
