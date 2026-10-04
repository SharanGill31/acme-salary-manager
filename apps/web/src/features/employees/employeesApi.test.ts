import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { DEFAULT_EMPLOYEE_DETAIL } from "../../mocks/handlers";
import { ApiError } from "../../lib/api";
import { fetchEmployee, recordSalaryChange, updateEmployee } from "./employeesApi";

describe("fetchEmployee", () => {
  it("returns the employee detail for the given id", async () => {
    const detail = await fetchEmployee(1);

    expect(detail).toEqual(DEFAULT_EMPLOYEE_DETAIL);
  });

  it("throws an ApiError with status 404 when the employee does not exist", async () => {
    server.use(
      http.get("/api/employees/:id", () =>
        HttpResponse.json({ error: "Employee not found" }, { status: 404 }),
      ),
    );

    await expect(fetchEmployee(999)).rejects.toMatchObject({
      constructor: ApiError,
      status: 404,
    });
  });
});

describe("updateEmployee", () => {
  it("sends a PATCH with only the given fields and returns the updated employee", async () => {
    let method: string | undefined;
    let receivedId: string | readonly string[] | undefined;
    let receivedBody: unknown;
    server.use(
      http.patch("/api/employees/:id", async ({ request, params }) => {
        method = request.method;
        receivedId = params.id;
        receivedBody = await request.json();
        return HttpResponse.json({ ...DEFAULT_EMPLOYEE_DETAIL.employee, jobTitle: "Staff Engineer" });
      }),
    );

    const result = await updateEmployee(1, { job_title: "Staff Engineer" });

    expect(method).toBe("PATCH");
    expect(receivedId).toBe("1");
    expect(receivedBody).toEqual({ job_title: "Staff Engineer" });
    expect(result.jobTitle).toBe("Staff Engineer");
  });

  it("surfaces a 409 conflict as an ApiError with the server message", async () => {
    server.use(
      http.patch("/api/employees/:id", () =>
        HttpResponse.json(
          { error: "An employee with email grace.hopper@acme.example already exists" },
          { status: 409 },
        ),
      ),
    );

    await expect(updateEmployee(1, { email: "grace.hopper@acme.example" })).rejects.toMatchObject({
      constructor: ApiError,
      status: 409,
      message: "An employee with email grace.hopper@acme.example already exists",
    });
  });
});

describe("recordSalaryChange", () => {
  it("posts the snake_case body and returns the updated detail with warnings", async () => {
    let receivedBody: unknown;
    let receivedId: string | readonly string[] | undefined;
    server.use(
      http.post("/api/employees/:id/salary-changes", async ({ request, params }) => {
        receivedId = params.id;
        receivedBody = await request.json();
        return HttpResponse.json({ ...DEFAULT_EMPLOYEE_DETAIL, warnings: [] }, { status: 201 });
      }),
    );

    const result = await recordSalaryChange(1, {
      new_amount_minor: 9500000,
      currency: "USD",
      effective_date: "2026-11-01",
      reason: "Annual review",
    });

    expect(receivedId).toBe("1");
    expect(receivedBody).toEqual({
      new_amount_minor: 9500000,
      currency: "USD",
      effective_date: "2026-11-01",
      reason: "Annual review",
    });
    expect(result.warnings).toEqual([]);
    expect(result.employee.id).toBe(1);
  });

  it("surfaces the first message of each 400 fieldErrors array on the ApiError", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json(
          {
            error: "Invalid request",
            fieldErrors: { effective_date: ["Invalid date", "Another message"] },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(
      recordSalaryChange(1, {
        new_amount_minor: 9500000,
        currency: "USD",
        effective_date: "not-a-date",
        reason: "Annual review",
      }),
    ).rejects.toMatchObject({
      status: 400,
      errors: { effective_date: "Invalid date" },
    });
  });

  it("surfaces 422 business-rule errors on the ApiError", async () => {
    server.use(
      http.post("/api/employees/:id/salary-changes", () =>
        HttpResponse.json(
          { errors: { reason: "Reason must be at least 3 characters" } },
          { status: 422 },
        ),
      ),
    );

    await expect(
      recordSalaryChange(1, {
        new_amount_minor: 9500000,
        currency: "USD",
        effective_date: "2026-11-01",
        reason: "x",
      }),
    ).rejects.toMatchObject({
      status: 422,
      errors: { reason: "Reason must be at least 3 characters" },
    });
  });
});
