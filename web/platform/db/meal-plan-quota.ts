/**
 * MP-2: soft monthly quota for meal plan generation.
 */
import { mealPlanFreeTierPerMonth } from "@/platform/config/meal-planning-config";
import { asRows, getSql } from "./client";

function monthStart(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export type MealPlanQuotaState = {
  used: number;
  limit: number;
  reset_at: string;
};

export async function getMealPlanQuota(
  tenantId: string,
  userId: string,
): Promise<MealPlanQuotaState> {
  const limit = mealPlanFreeTierPerMonth();
  const sql = getSql();
  if (!sql) {
    return { used: 0, limit, reset_at: monthStart() };
  }

  const resetAt = monthStart();
  const rows = await sql`
    SELECT meal_plan_generations_this_month, meal_plan_generations_reset_at
    FROM notification_preferences
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    LIMIT 1
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  if (!row) {
    return { used: 0, limit, reset_at: resetAt };
  }

  const storedReset = row.meal_plan_generations_reset_at
    ? String(row.meal_plan_generations_reset_at).slice(0, 10)
    : null;
  let used = Number(row.meal_plan_generations_this_month ?? 0);
  if (storedReset !== resetAt) {
    used = 0;
  }
  return { used, limit, reset_at: resetAt };
}

export async function canGenerateMealPlan(
  tenantId: string,
  userId: string,
): Promise<{ allowed: boolean; reason?: string; quota: MealPlanQuotaState }> {
  const quota = await getMealPlanQuota(tenantId, userId);
  if (quota.limit === 0) {
    return { allowed: true, quota };
  }
  if (quota.used >= quota.limit) {
    return {
      allowed: false,
      reason: `本月已規劃 ${quota.used} 次（免費版上限 ${quota.limit} 次）`,
      quota,
    };
  }
  return { allowed: true, quota };
}

export async function incrementMealPlanGenerationQuota(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  const resetAt = monthStart();

  await sql`
    INSERT INTO notification_preferences (
      tenant_id, user_id, meal_plan_generations_this_month, meal_plan_generations_reset_at
    ) VALUES (${tenantId}, ${userId}, 1, ${resetAt}::date)
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      meal_plan_generations_this_month = CASE
        WHEN notification_preferences.meal_plan_generations_reset_at IS DISTINCT FROM ${resetAt}::date
        THEN 1
        ELSE notification_preferences.meal_plan_generations_this_month + 1
      END,
      meal_plan_generations_reset_at = ${resetAt}::date,
      updated_at = now()
  `;
}
