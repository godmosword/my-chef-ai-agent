import type {
  AddFavoriteResponse,
  FavoriteItem,
  GetRecipeResponse,
  ListFavoritesResponse,
  ListRecipesResponse,
  RecipePayload,
  RecordRecipeCookResponse,
  RemoveFavoriteResponse,
} from "@chef/shared-types";
import {
  AddFavoriteResponseSchema,
  GetRecipeResponseSchema,
  ListFavoritesResponseSchema,
  ListRecipesResponseSchema,
  RecordRecipeCookResponseSchema,
  RemoveFavoriteResponseSchema,
} from "@chef/shared-types";
import { apiFetch } from "./client";

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
  return apiFetch(
    `/api/recipes${qs ? `?${qs}` : ""}`,
    undefined,
    ListRecipesResponseSchema,
  );
}

export async function getRecipe(id: string): Promise<GetRecipeResponse> {
  return apiFetch(`/api/recipes/${id}`, undefined, GetRecipeResponseSchema);
}

export async function recordRecipeCook(
  id: string,
  body: { rating?: number; record_cook?: boolean },
): Promise<RecordRecipeCookResponse> {
  return apiFetch(`/api/recipes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }, RecordRecipeCookResponseSchema);
}

export async function listFavorites(): Promise<ListFavoritesResponse> {
  return apiFetch(
    "/api/favorites",
    undefined,
    ListFavoritesResponseSchema,
  );
}

export async function addFavoriteByRecipeId(
  recipeId: string,
): Promise<AddFavoriteResponse> {
  return apiFetch("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ recipe_id: recipeId }),
  }, AddFavoriteResponseSchema);
}

export async function removeFavoriteByRecipeId(
  recipeId: string,
): Promise<RemoveFavoriteResponse> {
  return apiFetch(`/api/favorites/by-recipe/${encodeURIComponent(recipeId)}`, {
    method: "DELETE",
  }, RemoveFavoriteResponseSchema);
}

export type { FavoriteItem, ListRecipesResponse, RecipePayload };
