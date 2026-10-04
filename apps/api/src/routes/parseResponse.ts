import type { z } from "zod";

// Checks a response payload against its shared schema before it is sent.
// A mismatch is a bug on our side, not bad client input: it is raised as a
// plain Error (which the error handler logs and turns into a 500) rather than
// a ZodError (which it turns into a 400 meant for invalid requests).
export function parseResponse<S extends z.ZodType>(schema: S, payload: unknown): z.output<S> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error("Response did not match its schema", { cause: result.error });
  }
  return result.data;
}
