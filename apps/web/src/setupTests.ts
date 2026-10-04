import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom ships its own fetch-related classes (Request/Response/Headers/
// AbortController) that shadow Node's globals. undici (what Node's own
// fetch is built on, and what msw's node interceptor expects) does a
// strict instanceof check against its own classes, so jsdom's versions
// fail it. Restoring undici's classes here fixes MSW in this environment.
import { fetch, Headers, Request, Response, FormData } from "undici";

Object.assign(globalThis, { fetch, Headers, Request, Response, FormData });

const { server } = await import("./mocks/server");

// Cast needed: msw@2.15's `listen` options type runs the options through
// type-fest's PartialDeep, which mishandles `onUnhandledRequest`'s type
// (a string-literal union combined with a callback signature), making the
// otherwise-valid `{ onUnhandledRequest: "error" }` fail to typecheck.
beforeAll(() => server.listen({ onUnhandledRequest: "error" } as Parameters<typeof server.listen>[0]));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  cleanup();
});
afterAll(() => server.close());
