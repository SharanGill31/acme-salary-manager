import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app";
import { createTestDb } from "../db/testDb";
import { departments, employees, payBands } from "../db/schema";
import type { Db } from "../db/types";

describe("employees routes", () => {
  let app: Express;
  let engineeringId: number;
  let salesId: number;
  let adaId: number;

  beforeAll(async () => {
    const db: Db = await createTestDb();

    const [engineering, sales] = await db
      .insert(departments)
      .values([{ name: "Engineering" }, { name: "Sales" }])
      .returning({ id: departments.id });

    engineeringId = engineering.id;
    salesId = sales.id;

    const insertedEmployees = await db
      .insert(employees)
      .values([
        {
          employeeCode: "EMP000001",
          fullName: "Ada Lovelace",
          email: "ada.lovelace@acme.example",
          countryCode: "US",
          departmentId: engineeringId,
          jobTitle: "Software Engineer",
          level: "L3",
          status: "active",
          hireDate: new Date("2020-01-10"),
          salaryMinor: 9_000_000,
          currency: "USD",
        },
        {
          employeeCode: "EMP000002",
          fullName: "Grace Hopper",
          email: "grace.hopper@acme.example",
          countryCode: "US",
          departmentId: engineeringId,
          jobTitle: "Principal Engineer",
          level: "L5",
          status: "active",
          hireDate: new Date("2018-03-22"),
          salaryMinor: 18_000_000,
          currency: "USD",
        },
        {
          employeeCode: "EMP000003",
          fullName: "Alan Turing",
          email: "alan.turing@acme.example",
          countryCode: "GB",
          departmentId: engineeringId,
          jobTitle: "Staff Engineer",
          level: "L4",
          status: "inactive",
          hireDate: new Date("2019-07-15"),
          salaryMinor: 9_500_000,
          currency: "GBP",
        },
        {
          employeeCode: "EMP000004",
          fullName: "Margaret Hamilton",
          email: "margaret.hamilton@acme.example",
          countryCode: "GB",
          departmentId: salesId,
          jobTitle: "Account Executive",
          level: "L3",
          status: "active",
          hireDate: new Date("2021-02-01"),
          salaryMinor: 6_000_000,
          currency: "GBP",
        },
        {
          employeeCode: "EMP000005",
          fullName: "John Smith",
          email: "john.smith@acme.example",
          countryCode: "US",
          departmentId: salesId,
          jobTitle: "Sales Rep",
          level: "L2",
          status: "active",
          hireDate: new Date("2022-09-05"),
          salaryMinor: 5_000_000,
          currency: "USD",
        },
        {
          employeeCode: "EMP000006",
          fullName: "Katherine Johnson",
          email: "katherine.johnson@acme.example",
          countryCode: "GB",
          departmentId: salesId,
          jobTitle: "VP Sales",
          level: "L6",
          status: "inactive",
          hireDate: new Date("2016-11-30"),
          salaryMinor: 25_000_000,
          currency: "GBP",
        },
      ])
      .returning({ id: employees.id, employeeCode: employees.employeeCode });

    adaId = insertedEmployees.find((e) => e.employeeCode === "EMP000001")!.id;

    await db.insert(payBands).values([
      { level: "L3", countryCode: "US", minMinor: 7_000_000, maxMinor: 10_000_000 },
      { level: "L2", countryCode: "US", minMinor: 4_000_000, maxMinor: 7_000_000 },
    ]);

    app = createApp(db);
  });

  describe("GET /api/employees", () => {
    it("paginates results", async () => {
      const page1 = await request(app).get("/api/employees").query({ pageSize: 2, page: 1 });
      const page2 = await request(app).get("/api/employees").query({ pageSize: 2, page: 2 });
      const page3 = await request(app).get("/api/employees").query({ pageSize: 2, page: 3 });

      expect(page1.status).toBe(200);
      expect(page1.body.total).toBe(6);
      expect(page1.body.items).toHaveLength(2);
      expect(page2.body.items).toHaveLength(2);
      expect(page3.body.items).toHaveLength(2);

      const allCodes = [...page1.body.items, ...page2.body.items, ...page3.body.items].map(
        (item: { employeeCode: string }) => item.employeeCode,
      );
      expect(new Set(allCodes).size).toBe(6);
    });

    it("narrows results by countryCode", async () => {
      const response = await request(app).get("/api/employees").query({ countryCode: "GB" });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(
        response.body.items.every((item: { countryCode: string }) => item.countryCode === "GB"),
      ).toBe(true);
    });

    it("narrows results by departmentId", async () => {
      const response = await request(app).get("/api/employees").query({ departmentId: salesId });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(
        response.body.items.every(
          (item: { departmentId: number }) => item.departmentId === salesId,
        ),
      ).toBe(true);
    });

    it("narrows results by level", async () => {
      const response = await request(app).get("/api/employees").query({ level: "L3" });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(response.body.items.every((item: { level: string }) => item.level === "L3")).toBe(
        true,
      );
    });

    it("narrows results by status", async () => {
      const response = await request(app).get("/api/employees").query({ status: "inactive" });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(
        response.body.items.every((item: { status: string }) => item.status === "inactive"),
      ).toBe(true);
    });

    it("finds an employee by partial name", async () => {
      const response = await request(app).get("/api/employees").query({ search: "hopper" });

      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { fullName: string }) => item.fullName)).toEqual([
        "Grace Hopper",
      ]);
    });

    it("finds an employee by partial email", async () => {
      const response = await request(app)
        .get("/api/employees")
        .query({ search: "margaret.hamilton" });

      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { fullName: string }) => item.fullName)).toEqual([
        "Margaret Hamilton",
      ]);
    });

    it("finds an employee by employee code", async () => {
      const response = await request(app).get("/api/employees").query({ search: "EMP000006" });

      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { fullName: string }) => item.fullName)).toEqual([
        "Katherine Johnson",
      ]);
    });

    it("returns 400 with field errors for an invalid query", async () => {
      const response = await request(app).get("/api/employees").query({ pageSize: 500 });

      expect(response.status).toBe(400);
      expect(response.body.fieldErrors.pageSize).toBeTruthy();
    });
  });

  describe("GET /api/employees/:id", () => {
    it("returns the employee with history, pay band, band position and compa ratio", async () => {
      const response = await request(app).get(`/api/employees/${adaId}`);

      expect(response.status).toBe(200);
      expect(response.body.employee.fullName).toBe("Ada Lovelace");
      expect(response.body.salaryHistory).toEqual([]);
      expect(response.body.payBand).toEqual({
        level: "L3",
        countryCode: "US",
        minMinor: "7000000",
        maxMinor: "10000000",
      });
      expect(response.body.bandPosition).toBe("within");
      expect(response.body.compaRatio).toBe(1.06);
    });

    it("returns 404 when the employee does not exist", async () => {
      const response = await request(app).get("/api/employees/999999");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/employees", () => {
    function validBody(overrides: Record<string, unknown> = {}) {
      return {
        full_name: "New Hire",
        email: "new.hire@acme.example",
        employee_code: "EMP999999",
        country_code: "US",
        department_id: engineeringId,
        job_title: "Analyst",
        level: "L2",
        hire_date: "2026-01-01",
        salary_minor: 6_000_000,
        currency: "USD",
        status: "active",
        ...overrides,
      };
    }

    it("creates the employee and the first salary history row", async () => {
      const response = await request(app).post("/api/employees").send(validBody());

      expect(response.status).toBe(201);
      expect(response.body.fullName).toBe("New Hire");

      const detail = await request(app).get(`/api/employees/${response.body.id}`);

      expect(detail.body.salaryHistory).toHaveLength(1);
      expect(detail.body.salaryHistory[0].reason).toBe("Hire");
      expect(detail.body.salaryHistory[0].newAmountMinor).toBe("6000000");
      expect(detail.body.salaryHistory[0].previousAmountMinor).toBeNull();
    });

    it("returns 409 when the email already exists", async () => {
      const response = await request(app)
        .post("/api/employees")
        .send(validBody({ email: "ada.lovelace@acme.example", employee_code: "EMPDIFFERENT" }));

      expect(response.status).toBe(409);
    });

    it("returns 409 when the employee_code already exists", async () => {
      const response = await request(app)
        .post("/api/employees")
        .send(validBody({ email: "unique.person@acme.example", employee_code: "EMP000001" }));

      expect(response.status).toBe(409);
    });
  });

  describe("PATCH /api/employees/:id", () => {
    it("updates allowed profile fields", async () => {
      const response = await request(app)
        .patch(`/api/employees/${adaId}`)
        .send({ job_title: "Senior Software Engineer" });

      expect(response.status).toBe(200);
      expect(response.body.jobTitle).toBe("Senior Software Engineer");
    });

    it("returns 404 when the employee does not exist", async () => {
      const response = await request(app)
        .patch("/api/employees/999999")
        .send({ job_title: "x" });

      expect(response.status).toBe(404);
    });

    it("returns 409 when the new email already exists on another employee", async () => {
      const response = await request(app)
        .patch(`/api/employees/${adaId}`)
        .send({ email: "grace.hopper@acme.example" });

      expect(response.status).toBe(409);
    });
  });
});
