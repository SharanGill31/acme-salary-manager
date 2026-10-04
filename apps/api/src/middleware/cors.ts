import type { RequestHandler } from "express";

// Methods and request headers the API actually uses (JSON bodies on POST and
// PATCH). Kept minimal on purpose.
const ALLOWED_METHODS = "GET, POST, PATCH";
const ALLOWED_HEADERS = "Content-Type";
// How long a browser may cache a preflight answer, in seconds.
const PREFLIGHT_MAX_AGE = "600";

// Allows cross-origin requests from an explicit allowlist only (the deployed
// web app). Other origins get no CORS headers, so the browser blocks them.
// With an empty list it does nothing: local dev reaches the API through the
// Vite proxy, on the same origin.
export function cors(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    if (allowed.size === 0) return next();

    // Responses differ by Origin, so shared caches must key on it.
    res.vary("Origin");

    const origin = req.headers.origin;
    if (!origin || !allowed.has(origin)) return next();

    res.setHeader("Access-Control-Allow-Origin", origin);

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
      res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
      res.setHeader("Access-Control-Max-Age", PREFLIGHT_MAX_AGE);
      res.status(204).end();
      return;
    }

    next();
  };
}

// ALLOWED_ORIGINS is a comma-separated list, e.g.
// "https://acme-salary-web-nv6c.onrender.com".
export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
