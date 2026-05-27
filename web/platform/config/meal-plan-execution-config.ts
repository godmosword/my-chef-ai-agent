/** MP-4: meal plan execution pushes & weekly review (env-backed defaults). */

function envFlag(name: string, defaultOn = true): boolean {
  const v = process.env[name];
  if (v == null || v === "") return defaultOn;
  return v === "1" || v.toLowerCase() === "true";
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function isMealPlanExecutionPushEnabled(): boolean {
  return envFlag("ENABLE_MEAL_PLAN_EXECUTION_PUSH", true);
}

export function isWeeklyReviewEnabled(): boolean {
  return envFlag("ENABLE_WEEKLY_REVIEW", true);
}

export function mealPlanMorningDefaultHour(): number {
  return envInt("MEAL_PLAN_DAILY_MORNING_DEFAULT_HOUR", 9);
}

export function mealPlanEveningDefaultHour(): number {
  return envInt("MEAL_PLAN_DAILY_EVENING_DEFAULT_HOUR", 17);
}

export function mealPlanShoppingReminderDefaultDay(): number {
  return envInt("MEAL_PLAN_SHOPPING_REMINDER_DEFAULT_DAY", 5);
}

export function mealPlanShoppingReminderDefaultHour(): number {
  return envInt("MEAL_PLAN_SHOPPING_REMINDER_DEFAULT_HOUR", 9);
}

export function mealPlanWeeklyReviewDefaultDay(): number {
  return envInt("MEAL_PLAN_WEEKLY_REVIEW_DEFAULT_DAY", 6);
}

export function mealPlanWeeklyReviewDefaultHour(): number {
  return envInt("MEAL_PLAN_WEEKLY_REVIEW_DEFAULT_HOUR", 19);
}

export function mealPlanAutocompleteEngagementThreshold(): number {
  return envInt("MEAL_PLAN_AUTOCOMPLETE_ENGAGEMENT_THRESHOLD", 80) / 100;
}

export function mealPlanMorningIgnoreBackoffThreshold(): number {
  return 3;
}

export function mealPlanMorningBackoffDays(): number {
  return 14;
}

export function nextWeekAutoNudgeHour(): number {
  return envInt("NEXT_WEEK_AUTO_NUDGE_HOUR", 19);
}

export function reviewNarrativeLlmTimeoutSec(): number {
  return envInt("REVIEW_NARRATIVE_LLM_TIMEOUT_SEC", 10);
}
