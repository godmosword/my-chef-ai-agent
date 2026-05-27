/**
 * MP-4: in-app inbox payloads for meal plan execution pushes.
 */
import type { MealSlotRow } from "@/platform/db/meal-planning";
import type { WeeklyReviewInsights } from "@/application/meal-planning/weekly-review-insights";
import { getLocalParts } from "@/domain/notifications/quiet-hours";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

export function buildDailyMorningPayload(
  slots: MealSlotRow[],
  timezone: string,
  nowUtc: Date,
  expiringWarning?: string,
): Record<string, unknown> {
  const local = getLocalParts(nowUtc, timezone);
  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
  const title = `☀️ 早安，今天的菜單（週${weekdayLabels[local.weekday]} ${local.month}/${local.day}）`;
  return {
    kind: "meal_plan_morning",
    title,
    slots: slots
      .filter((s) => s.status === "planned")
      .map((s) => ({
        id: s.id,
        meal_type: s.meal_type,
        meal_label: MEAL_LABEL[s.meal_type] ?? s.meal_type,
        dish_title: s.dish_title,
        estimated_time_min: s.estimated_time_min,
        key_ingredients: s.key_ingredients.map((k) => k.display_name).join("、"),
      })),
    expiring_warning: expiringWarning ?? null,
    actions: ["view_recipe", "mark_cooked", "swap"],
  };
}

export function buildDailyEveningPayload(
  slots: MealSlotRow[],
): Record<string, unknown> {
  const planned = slots.filter((s) => s.status === "planned");
  const dinner = planned.find(
    (s) => s.meal_type === "dinner" || s.meal_type === "晚餐",
  );
  const headline = dinner?.dish_title ?? planned[0]?.dish_title ?? "今日菜單";
  const totalMin = planned.reduce(
    (a, s) => a + (s.estimated_time_min ?? 0),
    0,
  );
  return {
    kind: "meal_plan_evening",
    title: "🍳 晚餐快開始囉",
    headline,
    total_minutes: totalMin,
    slots: planned.map((s) => ({
      id: s.id,
      dish_title: s.dish_title,
      ingredients: s.key_ingredients.map((k) => ({
        name: k.display_name,
        from_pantry: k.from_pantry,
        urgency: k.urgency,
      })),
    })),
    actions: ["view_recipe", "mark_cooked", "skip_tonight", "substitute"],
  };
}

export function buildShoppingReminderPayload(
  summary: {
    unchecked_count: number;
    estimated_total: number | null;
    section_counts: Record<string, number>;
  },
  listId: number,
  planId: number,
): Record<string, unknown> {
  return {
    kind: "meal_plan_shopping",
    title: "🛒 採買日提醒",
    list_id: listId,
    plan_id: planId,
    unchecked_count: summary.unchecked_count,
    estimated_total: summary.estimated_total,
    sections: summary.section_counts,
    actions: ["view_list", "share", "snooze_day", "mark_done"],
  };
}

export function buildWeeklyReviewPayload(
  insights: WeeklyReviewInsights,
  narrative: string,
): Record<string, unknown> {
  const pct = Math.round(insights.cook_rate * 100);
  return {
    kind: "meal_plan_weekly_review",
    title: "📅 本週菜單回顧",
    date_range: insights.date_range,
    cook_rate_pct: pct,
    slots_cooked: insights.slots_cooked,
    slots_total: insights.slots_total,
    slots_skipped: insights.slots_skipped,
    slots_swapped: insights.slots_swapped,
    skip_reasons: insights.skip_reasons_summary,
    estimated_cost: insights.estimated_total_cost,
    actual_cost: insights.actual_total_cost,
    pantry_reuse_pct: Math.round(insights.pantry_reuse_score_actual * 100),
    wasted: insights.expiring_items_wasted,
    new_dishes: insights.new_dishes_tried,
    narrative,
    actions: ["view_data", "plan_next_week", "save_new_dishes", "rest"],
  };
}

export function buildNextWeekNudgePayload(
  constraintsSummary: string,
): Record<string, unknown> {
  return {
    kind: "meal_plan_next_week",
    title: "明天就週一了，要規劃這週菜單嗎？",
    constraints_summary: constraintsSummary,
    actions: ["same_constraints", "adjust", "skip_week"],
  };
}
