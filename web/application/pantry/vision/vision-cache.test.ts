import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearVisionCacheForTests,
  getVisionCache,
  hashImageBytes,
  setVisionCache,
} from "./vision-cache";
import * as metrics from "@/platform/observability/pantry-vision-metrics";

describe("vision cache", () => {
  beforeEach(() => {
    clearVisionCacheForTests();
    vi.spyOn(metrics, "recordPantryVisionCacheHit").mockImplementation(() => {});
  });

  it("returns cached value within TTL", () => {
    const hash = hashImageBytes(Buffer.from("same-image"));
    setVisionCache(hash, { ok: true });
    expect(getVisionCache<{ ok: boolean }>(hash)).toEqual({ ok: true });
  });

  it("hash is stable", () => {
    const a = hashImageBytes(Buffer.from("abc"));
    const b = hashImageBytes(Buffer.from("abc"));
    expect(a).toBe(b);
  });
});
