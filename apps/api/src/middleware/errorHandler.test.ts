import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { ConflictError, errorHandler, NotFoundError, ValidationError } from "./errorHandler";

function createMockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
}

describe("errorHandler", () => {
  it("maps a ZodError to 400 with field errors", () => {
    const schema = z.object({ pageSize: z.number().max(100) });
    const result = schema.safeParse({ pageSize: 500 });
    const res = createMockRes();

    if (result.success) throw new Error("expected validation to fail");

    errorHandler(result.error, {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldErrors: expect.objectContaining({ pageSize: expect.any(Array) }),
      }),
    );
  });

  it("maps a NotFoundError to 404", () => {
    const res = createMockRes();

    errorHandler(new NotFoundError("Employee not found"), {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Employee not found" }));
  });

  it("maps a ConflictError to 409", () => {
    const res = createMockRes();

    errorHandler(new ConflictError("email already exists"), {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "email already exists" }),
    );
  });

  it("maps a ValidationError to 422 with the errors object", () => {
    const res = createMockRes();

    errorHandler(
      new ValidationError({ reason: "reason must be at least 3 characters" }),
      {} as Request,
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: { reason: "reason must be at least 3 characters" },
      }),
    );
  });

  it("maps any other error to 500 without leaking details", () => {
    const res = createMockRes();

    errorHandler(new Error("database password is wrong"), {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const [[body]] = (res.json as ReturnType<typeof vi.fn>).mock.calls;
    expect(JSON.stringify(body)).not.toContain("database password");
  });
});
