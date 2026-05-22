import type { RecipePayload, RecipeWithLatestVersion } from "@chef/shared-types";

export type RecipeCardModel = {
  id: string;
  title: string;
  cuisine?: string | null;
  heroUrl?: string | null;
  tags: { tag: string }[];
  lastCookedAt?: string | null;
  cookCount?: number;
};

export function recipeListItemToCard(row: RecipeWithLatestVersion): RecipeCardModel {
  return {
    id: row.id,
    title: row.title,
    cuisine: row.cuisine,
    heroUrl: row.hero_url,
    tags: row.tags ?? [],
    lastCookedAt: row.last_cooked_at,
    cookCount: row.cook_count,
  };
}

export function payloadToCard(recipe: RecipePayload): RecipeCardModel | null {
  if (!recipe.id) return null;
  return {
    id: recipe.id,
    title: recipe.recipe_name ?? "美味食譜",
    cuisine: recipe.cuisine ?? recipe.theme,
    heroUrl: recipe.photo_url,
    tags: recipe.tags ?? [],
  };
}
