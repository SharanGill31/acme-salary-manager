import { Router } from "express";
import { insightsByLevelQuerySchema, insightsOutliersQuerySchema } from "shared";
import type { Db } from "../db/types";
import { createInsightsRepository } from "../repositories/insights";
import {
  getByCountry,
  getByDepartment,
  getByLevel,
  getOutliers,
  getSummary,
  type OutlierItem,
} from "../services/insights";

function toWireOutlier(item: OutlierItem) {
  return {
    ...item,
    salaryMinor: String(item.salaryMinor),
    payBand: {
      minMinor: String(item.payBand.minMinor),
      maxMinor: String(item.payBand.maxMinor),
    },
  };
}

export function createInsightsRouter(db: Db): Router {
  const router = Router();
  const repo = createInsightsRepository(db);

  router.get("/summary", async (_req, res, next) => {
    try {
      res.json(await getSummary(repo));
    } catch (err) {
      next(err);
    }
  });

  router.get("/by-country", async (_req, res, next) => {
    try {
      res.json(await getByCountry(repo));
    } catch (err) {
      next(err);
    }
  });

  router.get("/by-department", async (_req, res, next) => {
    try {
      res.json(await getByDepartment(repo));
    } catch (err) {
      next(err);
    }
  });

  router.get("/by-level", async (req, res, next) => {
    try {
      const query = insightsByLevelQuerySchema.parse(req.query);
      res.json(await getByLevel(repo, query.countryCode));
    } catch (err) {
      next(err);
    }
  });

  router.get("/outliers", async (req, res, next) => {
    try {
      const query = insightsOutliersQuerySchema.parse(req.query);
      const result = await getOutliers(repo, query.page, query.pageSize);

      res.json({
        items: result.items.map(toWireOutlier),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
