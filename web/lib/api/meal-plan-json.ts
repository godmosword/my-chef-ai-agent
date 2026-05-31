import type { MealPlanRow, MealSlotRow } from "@/platform/db/meal-planning";

export function mealSlotToJson(slot: MealSlotRow) {
  return {
    id: slot.id,
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
    cooked_at: slot.cooked_at,
    skipped_at: slot.skipped_at,
    notes: slot.notes,
  };
}

export function mealPlanToJson(plan: MealPlanRow) {
  return {
    id: plan.id,
    start_date: plan.start_date,
    end_date: plan.end_date,
    meal_pattern: plan.meal_pattern,
    constraints: plan.constraints,
    target_household_member_ids: plan.target_household_member_ids,
    status: plan.status,
    name: plan.name,
    total_estimated_cost: plan.total_estimated_cost,
    pantry_reuse_score: plan.pantry_reuse_score,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
    activated_at: plan.activated_at,
    completed_at: plan.completed_at,
    slots: plan.slots?.map(mealSlotToJson) ?? [],
  };
}
