import express, { type Express } from "express";
import type { Db } from "./db/types";
import { cors } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { createEmployeesRouter } from "./routes/employees";
import { createInsightsRouter } from "./routes/insights";
import { createMetaRouter } from "./routes/meta";

export interface AppOptions {
  // Origins allowed to call the API cross-origin (the deployed web app).
  allowedOrigins?: readonly string[];
}

export function createApp(db: Db, options: AppOptions = {}): Express {
  const app = express();

  app.use(cors(options.allowedOrigins ?? []));
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
