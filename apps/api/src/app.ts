import express, { type Express } from "express";
import type { Db } from "./db/types";
import { errorHandler } from "./middleware/errorHandler";
import { createEmployeesRouter } from "./routes/employees";
import { createInsightsRouter } from "./routes/insights";
import { createMetaRouter } from "./routes/meta";

export function createApp(db: Db): Express {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/employees", createEmployeesRouter(db));
  app.use("/api/meta", createMetaRouter(db));
  app.use("/api/insights", createInsightsRouter(db));

  app.use(errorHandler);

  return app;
}
