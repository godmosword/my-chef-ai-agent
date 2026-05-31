import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiFetch } from "./client";

const ContractSchema = z.object({
  ok: z.literal(true),
  name: z.string(),
});

describe("apiFetch response contracts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data when the response matches the provided schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, name: "miso" }))),
    );

    const data = await apiFetch("/api/test", undefined, ContractSchema);

    expect(data.name).toBe("miso");
  });

  it("rejects successful responses that do not match the provided schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, name: 42 }))),
    );

    await expect(apiFetch("/api/test", undefined, ContractSchema)).rejects.toMatchObject({
      name: "ApiError",
      message: "Invalid API response",
      status: 200,
    } satisfies Partial<ApiError>);
  });

  it("validates an existing Response object with the provided schema", async () => {
    const response = new Response(JSON.stringify({ ok: true, name: "tofu" }));

    const { parseApiResponse } = await import("./client");
    const data = await parseApiResponse(response, ContractSchema);

    expect(data.name).toBe("tofu");
  });
});
