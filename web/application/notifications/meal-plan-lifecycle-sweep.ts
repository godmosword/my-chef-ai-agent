/**
 * MP-4: auto-complete meal plans past end_date.
 */
import { mealPlanAutocompleteEngagementThreshold } from "@/platform/config/meal-plan-execution-config";
import {
  completeMealPlanWithMeta,
  getPlanSlotEngagement,
  listActivePlansPastEndDate,
} from "@/platform/db/meal-planning";
import { getLocalParts } from "@/domain/notifications/quiet-hours";

export type LifecycleSweepResult = {
  completed: number;
  low_engagement: number;
};

export async function runMealPlanLifecycleSweep(
  tenantId: string,
  nowUtc: Date = new Date(),
): Promise<LifecycleSweepResult> {
  const local = getLocalParts(nowUtc, "Asia/Taipei");
  const m = String(local.month).padStart(2, "0");
  const d = String(local.day).padStart(2, "0");
  const today = `${local.year}-${m}-${d}`;

  const plans = await listActivePlansPastEndDate(tenantId, today);
  const threshold = mealPlanAutocompleteEngagementThreshold();
  let completed = 0;
  let lowEngagement = 0;

  for (const plan of plans) {
    const engagement = await getPlanSlotEngagement(
      plan.id,
      tenantId,
      plan.user_id,
    );
    const low = engagement.engagement_rate < threshold;
    if (low) lowEngagement += 1;
    await completeMealPlanWithMeta(plan.id, tenantId, plan.user_id, {
      auto_completed_with_low_engagement: low,
    });
    completed += 1;
  }

  return { completed, low_engagement: lowEngagement };
}
