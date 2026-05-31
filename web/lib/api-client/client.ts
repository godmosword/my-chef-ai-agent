import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function parseJsonText<T>(text: string, status: number): T {
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new ApiError(`Invalid JSON (${status})`, status);
  }
}

function errorMessageFromEnvelope(data: unknown, status: number): string {
  return (
    typeof data === "object" &&
      data &&
      "error" in data &&
      typeof data.error === "string"
      ? data.error
      : `HTTP ${status}`
  );
}

export async function apiFetch<S extends z.ZodTypeAny>(
  path: string,
  init: RequestInit | undefined,
  schema: S,
): Promise<z.infer<S>>;
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T>;
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  schema?: z.ZodTypeAny,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await res.text();
  const data = parseJsonText<T>(text, res.status);

  const envelope = data as T & { ok?: boolean; error?: string };
  if (!res.ok || envelope.ok === false) {
    throw new ApiError(errorMessageFromEnvelope(data, res.status), res.status, data);
  }

  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError("Invalid API response", res.status, {
        issues: parsed.error.flatten(),
        data,
      });
    }
    return parsed.data;
  }

  return data;
}

export async function parseApiResponse<S extends z.ZodTypeAny>(
  response: Response,
  schema: S,
): Promise<z.infer<S>> {
  const text = await response.text();
  const data = parseJsonText<unknown>(text, response.status);
  const envelope = data as { ok?: boolean };

  if (!response.ok || envelope.ok === false) {
    throw new ApiError(
      errorMessageFromEnvelope(data, response.status),
      response.status,
      data,
    );
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError("Invalid API response", response.status, {
      issues: parsed.error.flatten(),
      data,
    });
  }
  return parsed.data;
}
