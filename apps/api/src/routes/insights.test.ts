import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app";
import { createTestDb } from "../db/testDb";
import { departments, employees, exchangeRates, payBands } from "../db/schema";
import type { Db } from "../db/types";

// Exchange rates are deliberately round numbers (not the real seed's rates) so
// every expected number in this file can be checked by hand: USD stays 1:1,
// GBP doubles. Twelve active employees, split evenly across 2 countries,
// 2 departments, and 3 levels, with exactly half placed outside their pay
// band on purpose. Two inactive employees carry absurd salaries (999,999,999
// and 1) specifically so a broken "active only" filter would be obvious.
describe("insights routes", () => {
  let app: Express;

  beforeAll(async () => {
    const db: Db = await createTestDb();

    await db.insert(exchangeRates).values([
      { currency: "USD", rateToUsd: "1.000000" },
      { currency: "GBP", rateToUsd: "2.000000" },
    ]);

    const [engineering, sales] = await db
      .insert(departments)
      .values([{ name: "Engineering" }, { name: "Sales" }])
      .returning({ id: departments.id });

    await db.insert(payBands).values([
      { level: "L1", countryCode: "US", minMinor: 4_000_000, maxMinor: 6_000_000 },
      { level: "L2", countryCode: "US", minMinor: 6_000_000, maxMinor: 8_000_000 },
      { level: "L3", countryCode: "US", minMinor: 8_000_000, maxMinor: 10_000_000 },
      { level: "L1", countryCode: "GB", minMinor: 3_000_000, maxMinor: 5_000_000 },
      { level: "L2", countryCode: "GB", minMinor: 5_000_000, maxMinor: 7_000_000 },
      { level: "L3", countryCode: "GB", minMinor: 7_000_000, maxMinor: 9_000_000 },
    ]);

    function employee(overrides: {
      code: string;
      name: string;
      countryCode: string;
      departmentId: number;
      level: "L1" | "L2" | "L3";
      status: "active" | "inactive";
      salaryMajor: number;
      currency: string;
    }) {
      return {
        employeeCode: overrides.code,
        fullName: overrides.name,
        email: `${overrides.code.toLowerCase()}@acme.example`,
        countryCode: overrides.countryCode,
        departmentId: overrides.departmentId,
        jobTitle: "Staff",
        level: overrides.level,
        status: overrides.status,
        hireDate: new Date("2020-01-01"),
        salaryMinor: overrides.salaryMajor * 100,
        currency: overrides.currency,
      };
    }

    await db.insert(employees).values([
      employee({ code: "EMP000001", name: "Alice", countryCode: "US", departmentId: engineering.id, level: "L1", status: "active", salaryMajor: 50_000, currency: "USD" }),
      employee({ code: "EMP000002", name: "Bob", countryCode: "US", departmentId: engineering.id, level: "L1", status: "active", salaryMajor: 65_000, currency: "USD" }),
      employee({ code: "EMP000003", name: "Carol", countryCode: "US", departmentId: engineering.id, level: "L2", status: "active", salaryMajor: 70_000, currency: "USD" }),
      employee({ code: "EMP000004", name: "Dave", countryCode: "US", departmentId: sales.id, level: "L2", status: "active", salaryMajor: 50_000, currency: "USD" }),
      employee({ code: "EMP000005", name: "Eve", countryCode: "US", departmentId: sales.id, level: "L3", status: "active", salaryMajor: 90_000, currency: "USD" }),
      employee({ code: "EMP000006", name: "Frank", countryCode: "US", departmentId: sales.id, level: "L3", status: "active", salaryMajor: 125_000, currency: "USD" }),
      employee({ code: "EMP000007", name: "Grace", countryCode: "GB", departmentId: engineering.id, level: "L1", status: "active", salaryMajor: 40_000, currency: "GBP" }),
      employee({ code: "EMP000008", name: "Heidi", countryCode: "GB", departmentId: engineering.id, level: "L1", status: "active", salaryMajor: 20_000, currency: "GBP" }),
      employee({ code: "EMP000009", name: "Ivan", countryCode: "GB", departmentId: sales.id, level: "L2", status: "active", salaryMajor: 60_000, currency: "GBP" }),
      employee({ code: "EMP000010", name: "Judy", countryCode: "GB", departmentId: sales.id, level: "L2", status: "active", salaryMajor: 81_000, currency: "GBP" }),
      employee({ code: "EMP000011", name: "Mallory", countryCode: "GB", departmentId: engineering.id, level: "L3", status: "active", salaryMajor: 80_000, currency: "GBP" }),
      employee({ code: "EMP000012", name: "Niaj", countryCode: "GB", departmentId: engineering.id, level: "L3", status: "active", salaryMajor: 55_000, currency: "GBP" }),
      employee({ code: "EMP000013", name: "Oscar", countryCode: "US", departmentId: sales.id, level: "L3", status: "inactive", salaryMajor: 999_999_999, currency: "USD" }),
      employee({ code: "EMP000014", name: "Peggy", countryCode: "GB", departmentId: sales.id, level: "L1", status: "inactive", salaryMajor: 1, currency: "GBP" }),
    ]);

    app = createApp(db);
  });

  describe("GET /api/insights/summary", () => {
    it("aggregates active employees only", async () => {
      const response = await request(app).get("/api/insights/summary");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        headcount: 12,
        totalPayrollUsdMinor: "112200000",
        medianSalaryUsdMinor: "8500000",
        employeesOutsideBand: 6,
      });
    });
  });

  // Money is integer minor units as strings everywhere in the API (never
  // floats); this guards every insights endpoint at once.
  it("returns every money amount as an integer minor-unit string", async () => {
    const responses = await Promise.all(
      [
        "/api/insights/summary",
        "/api/insights/by-country",
        "/api/insights/by-department",
        "/api/insights/by-level",
        "/api/insights/by-level?countryCode=GB",
        "/api/insights/outliers",
      ].map((path) => request(app).get(path)),
    );

    const moneyValues: unknown[] = [];
    function collect(value: unknown, key = ""): void {
      if (Array.isArray(value)) value.forEach((item) => collect(item));
      else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) collect(v, k);
      } else if (/Minor$/.test(key)) moneyValues.push(value);
    }
    responses.forEach((response) => collect(response.body));

    expect(moneyValues.length).toBeGreaterThan(50);
    for (const value of moneyValues) {
      expect(value).toEqual(expect.stringMatching(/^\d+$/));
    }
  });

  describe("GET /api/insights/by-country", () => {
    it("returns per-country aggregates in USD", async () => {
      const response = await request(app).get("/api/insights/by-country");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          countryCode: "GB",
          headcount: 6,
          totalPayrollUsdMinor: "67200000",
          averageSalaryUsdMinor: "11200000",
          medianSalaryUsdMinor: "11500000",
        },
        {
          countryCode: "US",
          headcount: 6,
          totalPayrollUsdMinor: "45000000",
          averageSalaryUsdMinor: "7500000",
          medianSalaryUsdMinor: "6750000",
        },
      ]);
    });
  });

  describe("GET /api/insights/by-department", () => {
    it("returns per-department aggregates in USD", async () => {
      const response = await request(app).get("/api/insights/by-department");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      const engineering = response.body.find(
        (row: { departmentName: string }) => row.departmentName === "Engineering",
      );
      const sales = response.body.find(
        (row: { departmentName: string }) => row.departmentName === "Sales",
      );

      // $575,000 / 7 = 8,214,285.71… cents, rounded to the nearest cent.
      expect(engineering).toMatchObject({
        headcount: 7,
        totalPayrollUsdMinor: "57500000",
        averageSalaryUsdMinor: "8214286",
        medianSalaryUsdMinor: "7000000",
      });

      expect(sales).toMatchObject({
        headcount: 5,
        totalPayrollUsdMinor: "54700000",
        averageSalaryUsdMinor: "10940000",
        medianSalaryUsdMinor: "12000000",
      });
    });
  });

  describe("GET /api/insights/by-level", () => {
    it("returns USD amounts when no countryCode is given", async () => {
      const response = await request(app).get("/api/insights/by-level");

      expect(response.status).toBe(200);
      expect(response.body.currency).toBe("USD");
      expect(response.body.levels).toEqual([
        { level: "L1", minSalaryMinor: "4000000", medianSalaryMinor: "5750000", averageSalaryMinor: "5875000", maxSalaryMinor: "8000000" },
        { level: "L2", minSalaryMinor: "5000000", medianSalaryMinor: "9500000", averageSalaryMinor: "10050000", maxSalaryMinor: "16200000" },
        { level: "L3", minSalaryMinor: "9000000", medianSalaryMinor: "11750000", averageSalaryMinor: "12125000", maxSalaryMinor: "16000000" },
      ]);
    });

    it("returns local currency amounts when countryCode is given", async () => {
      const response = await request(app)
        .get("/api/insights/by-level")
        .query({ countryCode: "GB" });

      expect(response.status).toBe(200);
      expect(response.body.currency).toBe("GBP");
      expect(response.body.levels).toEqual([
        { level: "L1", minSalaryMinor: "2000000", medianSalaryMinor: "3000000", averageSalaryMinor: "3000000", maxSalaryMinor: "4000000" },
        { level: "L2", minSalaryMinor: "6000000", medianSalaryMinor: "7050000", averageSalaryMinor: "7050000", maxSalaryMinor: "8100000" },
        { level: "L3", minSalaryMinor: "5500000", medianSalaryMinor: "6750000", averageSalaryMinor: "6750000", maxSalaryMinor: "8000000" },
      ]);
    });

    it("returns 400 for an invalid countryCode", async () => {
      const response = await request(app)
        .get("/api/insights/by-level")
        .query({ countryCode: "usa" });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/insights/outliers", () => {
    it("returns every employee outside their band with band position and compa-ratio", async () => {
      const response = await request(app)
        .get("/api/insights/outliers")
        .query({ pageSize: 100 });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(6);

      const byCode = Object.fromEntries(
        response.body.items.map((item: { employeeCode: string }) => [item.employeeCode, item]),
      );

      expect(byCode.EMP000002).toMatchObject({ fullName: "Bob", bandPosition: "above", compaRatio: 1.3 });
      expect(byCode.EMP000004).toMatchObject({ fullName: "Dave", bandPosition: "below", compaRatio: 0.71 });
      expect(byCode.EMP000006).toMatchObject({ fullName: "Frank", bandPosition: "above", compaRatio: 1.39 });
      expect(byCode.EMP000008).toMatchObject({ fullName: "Heidi", bandPosition: "below", compaRatio: 0.5 });
      expect(byCode.EMP000010).toMatchObject({ fullName: "Judy", bandPosition: "above", compaRatio: 1.35 });
      expect(byCode.EMP000012).toMatchObject({ fullName: "Niaj", bandPosition: "below", compaRatio: 0.69 });
    });

    it("paginates with a default pageSize of 20 and respects an explicit one", async () => {
      const page1 = await request(app).get("/api/insights/outliers").query({ pageSize: 4, page: 1 });
      const page2 = await request(app).get("/api/insights/outliers").query({ pageSize: 4, page: 2 });

      expect(page1.body.items).toHaveLength(4);
      expect(page1.body.items.map((i: { employeeCode: string }) => i.employeeCode)).toEqual([
        "EMP000002",
        "EMP000004",
        "EMP000006",
        "EMP000008",
      ]);

      expect(page2.body.items).toHaveLength(2);
      expect(page2.body.items.map((i: { employeeCode: string }) => i.employeeCode)).toEqual([
        "EMP000010",
        "EMP000012",
      ]);
    });
  });
});
