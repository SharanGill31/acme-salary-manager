import { Router } from "express";
import { employeeListQuerySchema, employeeListResponseSchema } from "shared";
import type { Db } from "../db/types";
import { createEmployeeRepository } from "../repositories/employees";
import { listEmployees, type EmployeeListRow } from "../services/employees";

function toWireItem(row: EmployeeListRow) {
  return {
    ...row,
    hireDate: row.hireDate.toISOString(),
    salaryMinor: String(row.salaryMinor),
  };
}

export function createEmployeesRouter(db: Db): Router {
  const router = Router();
  const repo = createEmployeeRepository(db);

  router.get("/", async (req, res, next) => {
    try {
      const query = employeeListQuerySchema.parse(req.query);
      const result = await listEmployees(repo, query);

      const payload = employeeListResponseSchema.parse({
        items: result.items.map(toWireItem),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });

      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
