import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  // `field` names the request field that conflicts, so clients can show the
  // message against it.
  constructor(
    message = "Conflict",
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationError";
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

  if (err instanceof ConflictError) {
    res
      .status(409)
      .json(
        err.field
          ? { error: err.message, errors: { [err.field]: err.message } }
          : { error: err.message },
      );
    return;
  }

  if (err instanceof ValidationError) {
    res.status(422).json({ errors: err.errors });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
