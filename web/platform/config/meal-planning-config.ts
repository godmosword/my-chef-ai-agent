/** MP-1: meal planning configuration */

export function mealPlanLlmMaxTokens(): number {
  return Math.max(
    800,
    parseInt(process.env.MEAL_PLAN_LLM_MAX_TOKENS || "2500", 10) || 2500,
  );
}

export function mealPlanLlmTimeoutSec(): number {
  return Math.max(
    10,
    parseInt(process.env.MEAL_PLAN_LLM_TIMEOUT_SEC || "30", 10) || 30,
  );
}

export function mealPlanMaxRepairIterations(): number {
  return Math.max(
    0,
    parseInt(process.env.MEAL_PLAN_MAX_REPAIR_ITERATIONS || "2", 10) || 2,
  );
}

export function mealPlanDefaultBudgetTwd(): number {
  return Math.max(
    0,
    parseInt(process.env.MEAL_PLAN_DEFAULT_BUDGET_TWD || "1500", 10) || 1500,
  );
}

export function mealPlanWeekdayMaxTime(): number {
  return Math.max(
    10,
    parseInt(process.env.MEAL_PLAN_WEEKDAY_MAX_TIME || "30", 10) || 30,
  );
}

export function mealPlanWeekendMaxTime(): number {
  return Math.max(
    15,
    parseInt(process.env.MEAL_PLAN_WEEKEND_MAX_TIME || "60", 10) || 60,
  );
}

export function isMealPlanningEnabled(): boolean {
  const v = process.env.ENABLE_MEAL_PLANNING;
  if (v == null || v === "") return true;
  return v === "1" || v.toLowerCase() === "true";
}
