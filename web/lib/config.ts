/** Runtime config from environment (mirrors app/config.py defaults). */

export const DEFAULT_MODEL_NAME = "gemini-3.1-flash-lite-preview";

export function resolveModelName(): string {
  const raw = process.env.MODEL_NAME?.trim() || DEFAULT_MODEL_NAME;
  return raw.replace(/^google\//i, "");
}

export const DEFAULT_TENANT_ID =
  process.env.DEFAULT_TENANT_ID?.trim() || "default";

export const MAX_HISTORY_TURNS = Math.max(
  1,
  parseInt(process.env.MAX_HISTORY_TURNS || "2", 10) || 2,
);

export const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: parseInt(process.env.PLAN_FREE_DAILY_LIMIT || "20", 10) || 20,
  pro: parseInt(process.env.PLAN_PRO_DAILY_LIMIT || "200", 10) || 200,
  enterprise:
    parseInt(process.env.PLAN_ENTERPRISE_DAILY_LIMIT || "2000", 10) || 2000,
};

export function resolvePlanLimit(planKey: string): number {
  return PLAN_DAILY_LIMITS[planKey] ?? PLAN_DAILY_LIMITS.free;
}
