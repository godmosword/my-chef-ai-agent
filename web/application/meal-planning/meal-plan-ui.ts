/**
 * MP-2: formatting helpers for meal plan UI (no PII in logs).
 */
import { computeAggregatedIngredientNeeds } from "@/domain/meal-planning/aggregate-ingredients";
import type { MealPlanConstraints } from "@/domain/meal-planning/types";
import type { MealPlanRow, MealSlotRow } from "@/platform/db/meal-planning";

export function formatPlanDateRangeZh(
  start: string,
  end: string,
): string {
  return `${start} ~ ${end}`;
}

export function countExpectedMeals(constraints: MealPlanConstraints): number {
  const pattern = constraints.meal_pattern;
  const mealsPerDay =
    (pattern.breakfast ? 1 : 0) +
    (pattern.lunch ? 1 : 0) +
    (pattern.dinner ? 1 : 0) +
    (pattern.snack ? 1 : 0);
  const start = new Date(`${constraints.start_date}T12:00:00Z`);
  const end = new Date(`${constraints.end_date}T12:00:00Z`);
  const days =
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(0, days * mealsPerDay);
}

export function computePlanSummary(
  plan: MealPlanRow,
  pantryItemCount: number,
): {
  date_range_zh: string;
  total_cost: number | null;
  budget: number | null;
  pantry_reuse_pct: number | null;
  slot_count: number;
  avg_time_min: number | null;
  purchase_count: number;
} {
  const slots = plan.slots?.filter((s) => s.status === "planned") ?? [];
  const times = slots
    .map((s) => s.estimated_time_min)
    .filter((t): t is number => t != null);
  const avg =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null;

  let purchaseCount = 0;
  if (slots.length && pantryItemCount >= 0) {
    const agg = computeAggregatedIngredientNeeds(
      slots.map((s) => ({
        slot_date: s.slot_date,
        meal_type: s.meal_type as "lunch",
        slot_index: s.slot_index,
        dish_title: s.dish_title,
        key_ingredients: s.key_ingredients,
      })),
      [],
    );
    purchaseCount = agg.filter((a) => !a.vague && (a.net_quantity ?? 0) > 0)
      .length;
  }

  return {
    date_range_zh: formatPlanDateRangeZh(plan.start_date, plan.end_date),
    total_cost: plan.total_estimated_cost,
    budget: plan.constraints.budget_total_twd ?? null,
    pantry_reuse_pct:
      plan.pantry_reuse_score == null
        ? null
        : Math.round(plan.pantry_reuse_score * 100),
    slot_count: slots.length,
    avg_time_min: avg,
    purchase_count: purchaseCount,
  };
}

export function serializePlanForClient(plan: MealPlanRow) {
  return {
    id: plan.id,
    start_date: plan.start_date,
    end_date: plan.end_date,
    meal_pattern: plan.meal_pattern,
    constraints: plan.constraints,
    status: plan.status,
    name: plan.name,
    total_estimated_cost: plan.total_estimated_cost,
    pantry_reuse_score: plan.pantry_reuse_score,
    generation_progress: plan.generation_progress,
    slots: (plan.slots ?? []).map(serializeSlotForClient),
  };
}

export function serializeSlotForClient(slot: MealSlotRow) {
  return {
    id: slot.id,
    meal_plan_id: slot.meal_plan_id,
    slot_date: slot.slot_date,
    meal_type: slot.meal_type,
    slot_index: slot.slot_index,
    dish_title: slot.dish_title,
    cuisine: slot.cuisine,
    estimated_time_min: slot.estimated_time_min,
    effort_level: slot.effort_level,
    key_ingredients: slot.key_ingredients,
    estimated_cost: slot.estimated_cost,
    tags: slot.tags,
    rationale: slot.rationale,
    status: slot.status,
    notes: slot.notes,
    has_full_recipe: Boolean(slot.full_recipe_json),
  };
}
