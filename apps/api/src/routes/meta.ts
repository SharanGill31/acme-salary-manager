import { Router } from "express";
import type { Db } from "../db/types";
import { createMetaRepository } from "../repositories/meta";
import { getMeta } from "../services/meta";

export function createMetaRouter(db: Db): Router {
  const router = Router();
  const repo = createMetaRepository(db);

  router.get("/", async (_req, res, next) => {
    try {
      const meta = await getMeta(repo);
      res.json(meta);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
