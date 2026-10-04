import { describe, expect, it, vi } from "vitest";
import { z, ZodError } from "zod";
import type { Request, Response } from "express";
import { errorHandler } from "../middleware/errorHandler";
import { parseResponse } from "./parseResponse";

const schema = z.object({ amountMinor: z.string().regex(/^\d+$/) });

function createMockRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response & typeof res;
}

describe("parseResponse", () => {
  it("returns the parsed payload when it matches the schema", () => {
    expect(parseResponse(schema, { amountMinor: "100", extra: true })).toEqual({
      amountMinor: "100",
    });
  });

  it("fails as a server error, not a client validation error, when the payload doesn't match", () => {
    let thrown: unknown;
    try {
      parseResponse(schema, { amountMinor: 1.5 });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ZodError);
  });

  it("reaches the client as a 500 without leaking the payload or schema details", () => {
    const res = createMockRes();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      parseResponse(schema, { amountMinor: "secret-1.5" });
    } catch (err) {
      errorHandler(err, {} as Request, res, vi.fn());
    }

    expect(res.status).toHaveBeenCalledWith(500);
    const [[body]] = res.json.mock.calls;
    expect(JSON.stringify(body)).not.toContain("amountMinor");
    expect(JSON.stringify(body)).not.toContain("secret");
    // The details are logged on the server for debugging.
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
