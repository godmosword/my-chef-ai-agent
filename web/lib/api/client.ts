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

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new ApiError(`Invalid JSON (${res.status})`, res.status);
  }

  const envelope = data as T & { ok?: boolean; error?: string };
  if (!res.ok || envelope.ok === false) {
    const msg =
      typeof envelope === "object" &&
      envelope &&
      "error" in envelope &&
      typeof envelope.error === "string"
        ? envelope.error
        : `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }

  return data;
}
