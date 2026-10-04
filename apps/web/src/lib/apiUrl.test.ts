import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { DEFAULT_META } from "../mocks/handlers";
import { api } from "./api";
import { apiUrl } from "./apiUrl";

const API_ORIGIN = "https://acme-salary-api-jqzf.onrender.com";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("apiUrl", () => {
  it("is same-origin when no base URL is configured", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(apiUrl("/employees?page=2")).toBe("/api/employees?page=2");
  });

  it("prefixes the configured API origin", () => {
    vi.stubEnv("VITE_API_BASE_URL", API_ORIGIN);

    expect(apiUrl("/employees/export?sortBy=full_name")).toBe(
      `${API_ORIGIN}/api/employees/export?sortBy=full_name`,
    );
  });

  it("ignores a trailing slash on the configured origin", () => {
    vi.stubEnv("VITE_API_BASE_URL", `${API_ORIGIN}/`);

    expect(apiUrl("/meta")).toBe(`${API_ORIGIN}/api/meta`);
  });
});

describe("api client with a configured base URL", () => {
  it("sends requests to the API origin", async () => {
    vi.stubEnv("VITE_API_BASE_URL", API_ORIGIN);
    let requested: string | undefined;
    server.use(
      http.get(`${API_ORIGIN}/api/meta`, ({ request }) => {
        requested = request.url;
        return HttpResponse.json(DEFAULT_META);
      }),
    );

    expect(await api.get("/meta")).toEqual(DEFAULT_META);
    expect(requested).toBe(`${API_ORIGIN}/api/meta`);
  });
});
