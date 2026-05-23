import type { RecipePayload, RecipeWithLatestVersion } from "@chef/shared-types";
import { getOfflineDb, OFFLINE_DEVICE_USER, type OfflineRecipe } from "./db";

export const MAX_OFFLINE_RECIPES = 20;

export function listItemToPayload(row: RecipeWithLatestVersion): RecipePayload {
  const v = row.latest_version;
  let kitchen_talk: RecipePayload["kitchen_talk"];
  if (v?.kitchen_talk) {
    try {
      const parsed = JSON.parse(v.kitchen_talk);
      kitchen_talk = Array.isArray(parsed) ? parsed : undefined;
    } catch {
      kitchen_talk = undefined;
    }
  }
  return {
    id: row.id,
    version_no: row.version_no ?? v?.version_no,
    recipe_name: row.title,
    cuisine: row.cuisine ?? undefined,
    photo_url: row.hero_url ?? undefined,
    tags: row.tags,
    ingredients: (v?.ingredients as RecipePayload["ingredients"]) ?? undefined,
    steps: (v?.steps as RecipePayload["steps"]) ?? undefined,
    shopping_list: (v?.shopping_list as RecipePayload["shopping_list"]) ?? undefined,
    kitchen_talk,
  };
}

export async function cacheRecipePayload(payload: RecipePayload): Promise<void> {
  const db = getOfflineDb();
  if (!db || !payload.id) return;
  const entry: OfflineRecipe = {
    id: payload.id,
    user_id: OFFLINE_DEVICE_USER,
    data: payload,
    cached_at: Date.now(),
  };
  await db.recipes.put(entry);
  await pruneOfflineRecipes();
}

export async function cacheRecipeListItems(
  items: RecipeWithLatestVersion[],
): Promise<void> {
  for (const row of items) {
    const payload = listItemToPayload(row);
    if (payload.id) await cacheRecipePayload(payload);
  }
}

async function pruneOfflineRecipes(): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  const all = await db.recipes.orderBy("cached_at").reverse().toArray();
  if (all.length <= MAX_OFFLINE_RECIPES) return;
  const toDrop = all.slice(MAX_OFFLINE_RECIPES);
  await db.recipes.bulkDelete(toDrop.map((r) => r.id));
}

export async function getOfflineRecipe(id: string): Promise<RecipePayload | null> {
  const db = getOfflineDb();
  if (!db) return null;
  const row = await db.recipes.get(id);
  return row?.data ?? null;
}

export async function listOfflineRecipes(limit = MAX_OFFLINE_RECIPES): Promise<OfflineRecipe[]> {
  const db = getOfflineDb();
  if (!db) return [];
  return db.recipes.orderBy("cached_at").reverse().limit(limit).toArray();
}
