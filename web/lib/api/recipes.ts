import { apiFetch } from "./client";
import type {
  GenerateRecipeRequest,
  RecipePayload,
  RecipeWithLatestVersion,
} from "@chef/shared-types";

export type QuotaResponse = {
  ok: true;
  db_configured: boolean;
  text: { used: number; limit: number; remaining: number };
  image: { used: number; limit: number; remaining: number };
};

export type ListRecipesResponse = {
  ok: true;
  items: RecipeWithLatestVersion[];
  next_cursor: string | null;
  db_configured: boolean;
};

export type GenerateRecipeResponse = {
  ok: true;
  recipe: RecipePayload;
  quota?: {
    remaining: number;
    limit: number;
    used: number;
    text: QuotaResponse["text"];
    image: QuotaResponse["image"];
  };
};

export async function fetchQuota(): Promise<QuotaResponse> {
  return apiFetch<QuotaResponse>("/api/quota");
}

export async function listRecipes(params?: {
  q?: string;
  cuisine?: string;
  tag?: string;
  favorite_only?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<ListRecipesResponse> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.cuisine) sp.set("cuisine", params.cuisine);
  if (params?.tag) sp.set("tag", params.tag);
  if (params?.favorite_only) sp.set("favorite_only", "true");
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.cursor) sp.set("cursor", params.cursor);
  const qs = sp.toString();
  return apiFetch<ListRecipesResponse>(`/api/recipes${qs ? `?${qs}` : ""}`);
}

export async function generateRecipe(
  body: GenerateRecipeRequest,
): Promise<GenerateRecipeResponse> {
  return apiFetch<GenerateRecipeResponse>("/api/recipes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRecipe(id: string): Promise<{ ok: true; recipe: RecipePayload }> {
  return apiFetch<{ ok: true; recipe: RecipePayload }>(`/api/recipes/${id}`);
}

export async function recordRecipeCook(
  id: string,
  body: { rating?: number; record_cook?: boolean },
): Promise<{ ok: true; updated: true }> {
  return apiFetch(`/api/recipes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type FavoriteItem = {
  id: number;
  recipe_id?: string;
  recipe_name: string;
  recipe_data?: RecipePayload;
  created_at: string;
};

export async function listFavorites(): Promise<{
  ok: true;
  items: FavoriteItem[];
  db_configured: boolean;
}> {
  return apiFetch<{ ok: true; items: FavoriteItem[]; db_configured: boolean }>(
    "/api/favorites",
  );
}

export async function addFavoriteByRecipeId(recipeId: string): Promise<{ ok: true; saved: true }> {
  return apiFetch("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ recipe_id: recipeId }),
  });
}

export async function removeFavoriteByRecipeId(
  recipeId: string,
): Promise<{ ok: true; deleted: boolean }> {
  return apiFetch(`/api/favorites/by-recipe/${encodeURIComponent(recipeId)}`, {
    method: "DELETE",
  });
}
