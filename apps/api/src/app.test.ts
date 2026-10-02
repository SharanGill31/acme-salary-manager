import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { createTestDb } from "./db/testDb";
import type { Db } from "./db/types";

describe("GET /api/health", () => {
  let db: Db;

  beforeAll(async () => {
    db = await createTestDb();
  });

  it("returns ok status", async () => {
    const response = await request(createApp(db)).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
