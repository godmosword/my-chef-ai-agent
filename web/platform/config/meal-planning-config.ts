/** MP-1: meal planning configuration */

export function isMealPlanningEnabled(): boolean {
  return process.env.ENABLE_MEAL_PLANNING !== "0";
}

export function mealPlanMaxDays(): number {
  return Math.max(1, parseInt(process.env.MEAL_PLAN_MAX_DAYS || "14", 10) || 14);
}

export function mealPlanDefaultDays(): number {
  return Math.max(1, parseInt(process.env.MEAL_PLAN_DEFAULT_DAYS || "7", 10) || 7);
}

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
