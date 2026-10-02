import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app";
import { createTestDb } from "../db/testDb";
import { departments, employees } from "../db/schema";
import type { Db } from "../db/types";

describe("GET /api/meta", () => {
  let app: Express;

  beforeAll(async () => {
    const db: Db = await createTestDb();

    const [engineering, sales] = await db
      .insert(departments)
      .values([{ name: "Engineering" }, { name: "Sales" }])
      .returning({ id: departments.id });

    await db.insert(employees).values([
      {
        employeeCode: "EMP000001",
        fullName: "Ada Lovelace",
        email: "ada.lovelace@acme.example",
        countryCode: "US",
        departmentId: engineering.id,
        jobTitle: "Software Engineer",
        level: "L3",
        status: "active",
        hireDate: new Date("2020-01-10"),
        salaryMinor: 9_000_000,
        currency: "USD",
      },
      {
        employeeCode: "EMP000002",
        fullName: "Alan Turing",
        email: "alan.turing@acme.example",
        countryCode: "GB",
        departmentId: engineering.id,
        jobTitle: "Staff Engineer",
        level: "L4",
        status: "inactive",
        hireDate: new Date("2019-07-15"),
        salaryMinor: 9_500_000,
        currency: "GBP",
      },
      {
        employeeCode: "EMP000003",
        fullName: "John Smith",
        email: "john.smith@acme.example",
        countryCode: "US",
        departmentId: sales.id,
        jobTitle: "Sales Rep",
        level: "L2",
        status: "active",
        hireDate: new Date("2022-09-05"),
        salaryMinor: 5_000_000,
        currency: "USD",
      },
    ]);

    app = createApp(db);
  });

  it("returns distinct countries, all departments, and the six levels", async () => {
    const response = await request(app).get("/api/meta");

    expect(response.status).toBe(200);
    expect(response.body.countries).toEqual(["GB", "US"]);
    expect(response.body.departments).toEqual([
      { id: expect.any(Number), name: "Engineering" },
      { id: expect.any(Number), name: "Sales" },
    ]);
    expect(response.body.levels).toEqual(["L1", "L2", "L3", "L4", "L5", "L6"]);
  });
});
