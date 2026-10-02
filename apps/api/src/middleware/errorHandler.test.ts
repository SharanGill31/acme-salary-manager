import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { errorHandler, NotFoundError } from "./errorHandler";

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

  it("maps any other error to 500 without leaking details", () => {
    const res = createMockRes();

    errorHandler(new Error("database password is wrong"), {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const [[body]] = (res.json as ReturnType<typeof vi.fn>).mock.calls;
    expect(JSON.stringify(body)).not.toContain("database password");
  });
});
