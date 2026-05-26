import { ApiError } from "@/lib/api/client";
import {
  getRecipe,
  listFavorites,
  listRecipes,
  type FavoriteItem,
  type ListRecipesResponse,
} from "@/lib/api/recipes";
import { payloadToCard, recipeListItemToCard } from "@/lib/recipe-display";
import type { RecipePayload } from "@chef/shared-types";
import {
  cacheRecipeListItems,
  cacheRecipePayload,
  getOfflineRecipe,
  listOfflineRecipes,
} from "./sync";
import { isBrowserOnline } from "./network";

export async function fetchRecipeWithOffline(
  id: string,
): Promise<{ recipe: RecipePayload; fromCache: boolean }> {
  if (isBrowserOnline()) {
    try {
      const res = await getRecipe(id);
      void cacheRecipePayload(res.recipe).catch(() => {});
      return { recipe: res.recipe, fromCache: false };
    } catch (e) {
      const cached = await getOfflineRecipe(id);
      if (cached) return { recipe: cached, fromCache: true };
      throw e;
    }
  }
  const cached = await getOfflineRecipe(id);
  if (!cached) {
    throw new ApiError("離線且此食譜尚未快取", 0);
  }
  return { recipe: cached, fromCache: true };
}

export async function listRecipesWithOffline(params?: {
  q?: string;
  cuisine?: string;
  limit?: number;
}): Promise<{
  items: ReturnType<typeof recipeListItemToCard>[];
  favoriteIds: Set<string>;
  offlineOnly: boolean;
}> {
  if (isBrowserOnline()) {
    try {
      const [recipesRes, favRes] = await Promise.all([
        listRecipes({
          q: params?.q,
          cuisine: params?.cuisine,
          limit: params?.limit ?? 50,
        }),
        listFavorites(),
      ]);
      void cacheRecipeListItems(recipesRes.items).catch(() => {});
      const ids = new Set<string>();
      for (const f of favRes.items) {
        if (f.recipe_id) ids.add(f.recipe_id);
      }
      return {
        items: recipesRes.items.map(recipeListItemToCard),
        favoriteIds: ids,
        offlineOnly: false,
      };
    } catch {
      /* fall through to offline */
    }
  }

  const cached = await listOfflineRecipes();
  let items = cached
    .map((r) => payloadToCard(r.data))
    .filter((c): c is NonNullable<typeof c> => c != null);

  const q = params?.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((i) => i.title.toLowerCase().includes(q));
  }
  if (params?.cuisine) {
    items = items.filter((i) => i.cuisine === params.cuisine);
  }

  return { items, favoriteIds: new Set(), offlineOnly: true };
}
