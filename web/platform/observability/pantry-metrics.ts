type ViewKind = "overview" | "category" | "expiring";
type ConsumePath = "button" | "natural_lang" | "recipe_consumed";
type CleanFridgePath = "pantry" | "typing";

const pantryViewTotal: Record<string, number> = {};
const pantryConsumeTotal: Record<string, number> = {};
const cleanFridgeTotal: Record<string, number> = {};
const recipeAnnotationTotal: Record<string, number> = {};
const recipeMatchRateBuckets = new Map<number, number>();

export function recordPantryView(view: ViewKind): void {
  pantryViewTotal[view] = (pantryViewTotal[view] ?? 0) + 1;
}

export function recordPantryConsume(path: ConsumePath): void {
  pantryConsumeTotal[path] = (pantryConsumeTotal[path] ?? 0) + 1;
}

export function recordCleanFridge(path: CleanFridgePath, source: "empty" | "nonempty"): void {
  const key = `${path}:${source}`;
  cleanFridgeTotal[key] = (cleanFridgeTotal[key] ?? 0) + 1;
}

export function recordRecipePantryAnnotation(
  result: "ok" | "timeout" | "skipped",
  matchRate?: number,
): void {
  recipeAnnotationTotal[result] = (recipeAnnotationTotal[result] ?? 0) + 1;
  if (matchRate != null && result === "ok") {
    const bucket = Math.floor(matchRate * 10) * 10;
    recipeMatchRateBuckets.set(
      bucket,
      (recipeMatchRateBuckets.get(bucket) ?? 0) + 1,
    );
  }
}

export function getPantryMetricsSnapshot(): Record<string, unknown> {
  const histogram: Record<string, number> = {};
  for (const [k, v] of recipeMatchRateBuckets) histogram[String(k)] = v;
  return {
    pantry_view_total: { ...pantryViewTotal },
    pantry_consume_total: { ...pantryConsumeTotal },
    clean_fridge_total: { ...cleanFridgeTotal },
    recipe_pantry_annotation_total: { ...recipeAnnotationTotal },
    recipe_pantry_match_rate: histogram,
  };
}

export function resetPantryMetricsForTests(): void {
  for (const k of Object.keys(pantryViewTotal)) delete pantryViewTotal[k];
  for (const k of Object.keys(pantryConsumeTotal)) delete pantryConsumeTotal[k];
  for (const k of Object.keys(cleanFridgeTotal)) delete cleanFridgeTotal[k];
  for (const k of Object.keys(recipeAnnotationTotal)) delete recipeAnnotationTotal[k];
  recipeMatchRateBuckets.clear();
}
