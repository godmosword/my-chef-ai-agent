import { createHash } from "node:crypto";
import { pantryVisionCacheTtlSec } from "@/platform/config/pantry-vision-config";
import { recordPantryVisionCacheHit } from "@/platform/observability/pantry-vision-metrics";

type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();

export function hashImageBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function getVisionCache<T>(hash: string): T | null {
  const entry = cache.get(hash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(hash);
    return null;
  }
  recordPantryVisionCacheHit();
  return entry.value as T;
}

export function setVisionCache<T>(hash: string, value: T): void {
  const ttlMs = pantryVisionCacheTtlSec() * 1000;
  cache.set(hash, { value, expiresAt: Date.now() + ttlMs });
}

export function clearVisionCacheForTests(): void {
  cache.clear();
}
