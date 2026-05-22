import type { RecipePayload as AiRecipePayload } from "@/lib/ai/generate-recipe";
import type { RecipePayload, RecipeTag, TagSource } from "@chef/shared-types";

export function kitchenTalkToText(
  talks: AiRecipePayload["kitchen_talk"],
): string | null {
  if (!talks?.length) return null;
  return talks
    .map((t) => `${t.role}: ${t.content}`)
    .join("\n");
}

export function costToJsonb(
  cost: string | undefined,
): unknown | null {
  if (!cost) return null;
  return { display: cost, currency: "TWD" };
}

/** Map AI recipe JSON to API/storage payload (backward compatible fields). */
export function aiRecipeToPayload(
  recipe: AiRecipePayload,
  ids?: { id: string; version_no: number },
  tags?: RecipeTag[],
): RecipePayload {
  return {
    id: ids?.id,
    version_no: ids?.version_no,
    recipe_name: recipe.recipe_name,
    theme: recipe.theme,
    kitchen_talk: recipe.kitchen_talk,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    shopping_list: recipe.shopping_list,
    estimated_total_cost: recipe.estimated_total_cost,
    photo_url: recipe.photo_url,
    cuisine: recipe.theme,
    summary: recipe.recipe_name,
    tags,
  };
}

export function normalizeTag(tag: string): string {
  return tag.trim().slice(0, 64);
}

export function buildTagsFromContext(
  contextTags: string[] | undefined,
  cuisine: string | null | undefined,
  aiTags?: string[],
): Array<{ tag: string; source: TagSource }> {
  const out: Array<{ tag: string; source: TagSource }> = [];
  const seen = new Set<string>();
  const add = (tag: string, source: TagSource) => {
    const n = normalizeTag(tag);
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push({ tag: n, source });
  };
  for (const t of contextTags || []) add(t, "user");
  for (const t of aiTags || []) add(t, "ai");
  if (cuisine) add(cuisine, "cuisine");
  return out;
}
