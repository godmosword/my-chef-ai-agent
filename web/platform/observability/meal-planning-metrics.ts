/** MP-1 meal planning metrics (GET /api/metrics). */

let lastGenerationDurationMs = 0;
let otelLastSpan: Record<string, string | number | boolean> | null = null;

const generationTotal: Record<string, number> = {};
const repairIterations: Record<string, number> = {};
const violationsTotal: Record<string, number> = {};
const reuseScoreBuckets: Record<string, number> = {};
const expansionTotal: Record<string, number> = {};

function k(...parts: string[]) {
  return parts.join("|");
}

export function recordMealPlanGeneration(
  result: "ok" | "llm_error" | "validation_failed" | "partial",
  durationMs: number,
  slotCount: number,
): void {
  generationTotal[k("meal_plan_generation_total", result)] =
    (generationTotal[k("meal_plan_generation_total", result)] ?? 0) + 1;
  lastGenerationDurationMs = durationMs;
  otelLastSpan = {
    "meal_plan.generate": true,
    result,
    slot_count: slotCount,
    duration_ms: durationMs,
  };
}

export function recordMealPlanRepairIterations(iterations: number): void {
  repairIterations[String(iterations)] =
    (repairIterations[String(iterations)] ?? 0) + 1;
  otelLastSpan = { "meal_plan.repair": true, iterations };
}

export function recordMealPlanViolation(code: string, severity: string): void {
  const key = k("meal_plan_violations_total", code, severity);
  violationsTotal[key] = (violationsTotal[key] ?? 0) + 1;
  otelLastSpan = { "meal_plan.validate": true, code, severity };
}

export function recordMealPlanReuseScore(score: number): void {
  const bucket = Math.floor(score * 10) * 10;
  reuseScoreBuckets[String(bucket)] = (reuseScoreBuckets[String(bucket)] ?? 0) + 1;
}

export function recordMealSlotExpansion(
  result: "ok" | "error" | "cache_hit",
): void {
  expansionTotal[k("meal_slot_expansion_total", result)] =
    (expansionTotal[k("meal_slot_expansion_total", result)] ?? 0) + 1;
  otelLastSpan = { "meal_plan.expand_slot": true, result };
}

export function getMealPlanningMetricsSnapshot(): Record<string, unknown> {
  return {
    meal_plan_generation_total: { ...generationTotal },
    meal_plan_generation_duration_ms: lastGenerationDurationMs,
    meal_plan_repair_iterations: { ...repairIterations },
    meal_plan_violations_total: { ...violationsTotal },
    meal_plan_pantry_reuse_score: { ...reuseScoreBuckets },
    meal_slot_expansion_total: { ...expansionTotal },
    otel_last_span: otelLastSpan,
  };
}

export function resetMealPlanningMetricsForTests(): void {
  for (const o of [
    generationTotal,
    repairIterations,
    violationsTotal,
    reuseScoreBuckets,
    expansionTotal,
  ]) {
    for (const key of Object.keys(o)) delete o[key];
  }
  lastGenerationDurationMs = 0;
  otelLastSpan = null;
}
