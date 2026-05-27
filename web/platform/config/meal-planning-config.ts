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

export function isMealPlanUiEnabled(): boolean {
  return (
    isMealPlanningEnabled() && process.env.ENABLE_MEAL_PLAN_UI !== "0"
  );
}

export function mealPlanGenerationUserTimeoutSec(): number {
  return Math.max(
    30,
    parseInt(process.env.MEAL_PLAN_GENERATION_USER_TIMEOUT_SEC || "90", 10) ||
      90,
  );
}

export function mealPlanFreeTierPerMonth(): number {
  return Math.max(
    0,
    parseInt(process.env.MEAL_PLAN_FREE_TIER_PER_MONTH || "2", 10) || 2,
  );
}

export function mealPlanPaidTierPerMonth(): number {
  return parseInt(process.env.MEAL_PLAN_PAID_TIER_PER_MONTH || "0", 10) || 0;
}

export function mealPlanSwapCandidatesCount(): number {
  return Math.max(
    1,
    parseInt(process.env.MEAL_PLAN_SWAP_CANDIDATES_COUNT || "3", 10) || 3,
  );
}

export function mealPlanSwapLlmTimeoutSec(): number {
  return Math.max(
    5,
    parseInt(process.env.MEAL_PLAN_SWAP_LLM_TIMEOUT_SEC || "15", 10) || 15,
  );
}
