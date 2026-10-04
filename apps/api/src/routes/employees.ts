import { Router } from "express";
import { z } from "zod";
import {
  createEmployeeSchema,
  employeeDetailResponseSchema,
  employeeExportQuerySchema,
  employeeListItemSchema,
  employeeListQuerySchema,
  employeeListResponseSchema,
  recordSalaryChangeResponseSchema,
  recordSalaryChangeSchema,
  updateEmployeeSchema,
} from "shared";
import { systemClock } from "../clock";
import type { Db } from "../db/types";
import { createEmployeeRepository } from "../repositories/employees";
import { createSalaryChangeRepository } from "../repositories/salaryChanges";
import {
  createEmployee,
  exportEmployees,
  getEmployeeDetail,
  listEmployees,
  updateEmployee,
  type EmployeeDetailResult,
  type EmployeeListRow,
} from "../services/employees";
import { recordSalaryChange } from "../services/salaryChanges";

const idParamSchema = z.coerce.number().int().positive();

function toWireItem(row: EmployeeListRow) {
  return {
    ...row,
    hireDate: row.hireDate.toISOString(),
    salaryMinor: String(row.salaryMinor),
  };
}

function toWireDetail(detail: EmployeeDetailResult) {
  return {
    employee: toWireItem(detail.employee),
    salaryHistory: detail.salaryHistory.map((change) => ({
      id: change.id,
      previousAmountMinor:
        change.previousAmountMinor === null ? null : String(change.previousAmountMinor),
      newAmountMinor: String(change.newAmountMinor),
      currency: change.currency,
      effectiveDate: change.effectiveDate.toISOString(),
      reason: change.reason,
      createdAt: change.createdAt.toISOString(),
    })),
    payBand: {
      level: detail.payBand.level,
      countryCode: detail.payBand.countryCode,
      minMinor: String(detail.payBand.minMinor),
      maxMinor: String(detail.payBand.maxMinor),
    },
    bandPosition: detail.bandPosition,
    compaRatio: detail.compaRatio,
  };
}

export function createEmployeesRouter(db: Db): Router {
  const router = Router();
  const repo = createEmployeeRepository(db);
  const salaryChangeRepo = createSalaryChangeRepository(db);

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

  // Registered before "/:id", which would otherwise match "export" and reject
  // it as an invalid id.
  router.get("/export", async (req, res, next) => {
    try {
      const query = employeeExportQuerySchema.parse(req.query);
      const { filename, csv } = await exportEmployees(repo, systemClock, query);

      res
        .status(200)
        .set({
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        })
        .send(csv);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const id = idParamSchema.parse(req.params.id);
      const detail = await getEmployeeDetail(repo, id);
      const payload = employeeDetailResponseSchema.parse(toWireDetail(detail));

      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const input = createEmployeeSchema.parse(req.body);
      const created = await createEmployee(repo, input);
      const payload = employeeListItemSchema.parse(toWireItem(created));

      res.status(201).json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const id = idParamSchema.parse(req.params.id);
      const patch = updateEmployeeSchema.parse(req.body);
      const updated = await updateEmployee(repo, id, patch);
      const payload = employeeListItemSchema.parse(toWireItem(updated));

      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/salary-changes", async (req, res, next) => {
    try {
      const employeeId = idParamSchema.parse(req.params.id);
      const body = recordSalaryChangeSchema.parse(req.body);

      const result = await recordSalaryChange(
        { employees: repo, salaryChanges: salaryChangeRepo },
        systemClock,
        {
          employeeId,
          newAmountMinor: body.new_amount_minor,
          currency: body.currency,
          effectiveDate: body.effective_date,
          reason: body.reason,
        },
      );

      const payload = recordSalaryChangeResponseSchema.parse({
        ...toWireDetail(result),
        warnings: result.warnings,
      });

      res.status(201).json(payload);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
