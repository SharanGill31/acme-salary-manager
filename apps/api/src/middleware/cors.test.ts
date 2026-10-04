import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Db } from "../db/types";
import { parseAllowedOrigins } from "./cors";

const WEB_ORIGIN = "https://acme-salary-web-nv6c.onrender.com";

// None of these requests reach a database query: /api/health doesn't use
// one, and preflights are answered before any route runs.
const noDb = {} as Db;

describe("CORS", () => {
  const app = createApp(noDb, { allowedOrigins: [WEB_ORIGIN] });

  it("allows a request from a configured origin", async () => {
    const response = await request(app).get("/api/health").set("Origin", WEB_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_ORIGIN);
    expect(response.headers.vary).toMatch(/\bOrigin\b/);
  });

  it("answers a preflight from a configured origin for the methods the API uses", async () => {
    const response = await request(app)
      .options("/api/employees/1")
      .set("Origin", WEB_ORIGIN)
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB_ORIGIN);
    expect(response.headers["access-control-allow-methods"]).toBe("GET, POST, PATCH");
    expect(response.headers["access-control-allow-headers"]).toBe("Content-Type");
  });

  it("gives no CORS headers to an origin that isn't configured", async () => {
    const response = await request(app).get("/api/health").set("Origin", "https://evil.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("gives no CORS headers when no origins are configured", async () => {
    const response = await request(createApp(noDb))
      .get("/api/health")
      .set("Origin", WEB_ORIGIN);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("parseAllowedOrigins", () => {
  it("reads a comma-separated list, ignoring spaces and empty entries", () => {
    expect(parseAllowedOrigins(` ${WEB_ORIGIN} , http://localhost:5173,, `)).toEqual([
      WEB_ORIGIN,
      "http://localhost:5173",
    ]);
  });

  it("returns no origins when the variable is unset or empty", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins("")).toEqual([]);
  });
});
