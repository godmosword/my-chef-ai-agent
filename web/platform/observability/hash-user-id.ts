import { createHash } from "node:crypto";

/** Stable short hash for metrics/logs — never log raw user_id with pantry data. */
export function hashUserIdForObservability(userId: string): string {
  const salt =
    process.env.LOG_USER_HASH_SALT?.trim() ||
    process.env.METRICS_TOKEN?.trim() ||
    "chef-metrics";
  return createHash("sha256")
    .update(`${salt}:${userId}`)
    .digest("hex")
    .slice(0, 12);
}
