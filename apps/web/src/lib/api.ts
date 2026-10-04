export interface ApiErrorPayload {
  status: number;
  message: string;
  errors?: Record<string, string>;
}

export class ApiError extends Error implements ApiErrorPayload {
  status: number;
  errors?: Record<string, string>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.errors = payload.errors;
  }
}

interface ErrorResponseBody {
  error?: string;
  // 400s carry Zod's flattened fieldErrors (arrays of messages); 422s carry
  // one message per field.
  fieldErrors?: Record<string, string[] | undefined>;
  errors?: Record<string, string>;
}

function firstMessages(fieldErrors: Record<string, string[] | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[field] = messages[0];
  }
  return result;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const errorBody = body as ErrorResponseBody | undefined;
    throw new ApiError({
      status: response.status,
      message: errorBody?.error ?? "Request failed",
      errors: errorBody?.fieldErrors ? firstMessages(errorBody.fieldErrors) : errorBody?.errors,
    });
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
};
