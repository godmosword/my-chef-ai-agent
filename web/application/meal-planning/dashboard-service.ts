/**
 * MP-4: aggregate dashboard metrics across meal plans.
 */
import {
  getActiveMealPlan,
  listMealPlans,
  getPlanSlotEngagement,
} from "@/platform/db/meal-planning";
import { buildWeeklyReviewInsights } from "./weekly-review-insights";

export type DashboardData = {
  streak_weeks: number;
  avg_cook_rate: number;
  avg_weekly_cost: number | null;
  waste_rate: number;
  active_plan: Awaited<ReturnType<typeof getActiveMealPlan>>;
  last_completed_insights: Awaited<
    ReturnType<typeof buildWeeklyReviewInsights>
  > | null;
  cook_rate_history: { plan_id: number; end_date: string; cook_rate: number }[];
};

export async function buildDashboardData(
  tenantId: string,
  userId: string,
): Promise<DashboardData> {
  const completed = await listMealPlans(tenantId, userId, {
    status_filter: "completed",
    limit: 8,
  });
  const rates: number[] = [];
  const costs: number[] = [];
  const history: DashboardData["cook_rate_history"] = [];
  let wasteTotal = 0;
  let wasteDenom = 0;

  for (const plan of completed) {
    const eng = await getPlanSlotEngagement(plan.id, tenantId, userId);
    rates.push(eng.engagement_rate);
    history.push({
      plan_id: plan.id,
      end_date: plan.end_date,
      cook_rate: eng.cooked / Math.max(eng.total, 1),
    });
    if (plan.total_estimated_cost != null) {
      costs.push(plan.total_estimated_cost);
    }
    const insights = await buildWeeklyReviewInsights(
      plan.id,
      tenantId,
      userId,
    );
    if (insights) {
      wasteDenom += insights.expiring_items_wasted.length + 1;
      wasteTotal += insights.expiring_items_wasted.length;
    }
  }

  const active = await getActiveMealPlan(tenantId, userId);
  const last = completed[0];
  const lastInsights = last
    ? await buildWeeklyReviewInsights(last.id, tenantId, userId)
    : null;

  let streak = 0;
  for (const plan of completed) {
    if (plan.status === "completed") streak += 1;
    else break;
  }

  return {
    streak_weeks: streak,
    avg_cook_rate:
      rates.length > 0
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : 0,
    avg_weekly_cost:
      costs.length > 0
        ? costs.reduce((a, b) => a + b, 0) / costs.length
        : null,
    waste_rate: wasteDenom > 0 ? wasteTotal / wasteDenom : 0,
    active_plan: active,
    last_completed_insights: lastInsights,
    cook_rate_history: history.slice(0, 4),
  };
}
