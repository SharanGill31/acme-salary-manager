// Where the API lives. Unset (dev, tests): same origin, reached through the
// Vite proxy. In production the API is on another domain, set at build time
// with VITE_API_BASE_URL (e.g. "https://acme-salary-api-jqzf.onrender.com").
// Read on each call, not once at import.
export function apiUrl(path: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  return `${baseUrl}/api${path}`;
}
