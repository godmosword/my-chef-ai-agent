/** PT-3: pantry UI + clean fridge integration. */

function envFlag(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function showPantryAnnotationsOnRecipe(): boolean {
  return envFlag("SHOW_PANTRY_ANNOTATIONS_ON_RECIPE", true);
}

export function pantryAnnotationTimeoutMs(): number {
  const n = parseInt(process.env.PANTRY_ANNOTATION_TIMEOUT_MS || "500", 10);
  return Number.isFinite(n) ? n : 500;
}

export function cleanFridgeUsePantry(): boolean {
  return envFlag("CLEAN_FRIDGE_USE_PANTRY", true);
}

export function pantryFlexItemsPerGroup(): number {
  const n = parseInt(process.env.PANTRY_FLEX_ITEMS_PER_GROUP || "5", 10);
  return Number.isFinite(n) ? n : 5;
}
