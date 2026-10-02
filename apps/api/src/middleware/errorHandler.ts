import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", fieldErrors: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
