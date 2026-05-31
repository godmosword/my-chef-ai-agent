import { apiFetch } from "./client";
import type { AppliedPersonalization } from "@/application/personalization/applied-personalization";
import type {
  DeleteRecipeResponse,
  GenerateRecipeRequest,
  GenerateRecipeResponse,
  QuotaResponse,
} from "@chef/shared-types";
import {
  DeleteRecipeResponseSchema,
  GenerateRecipeResponseSchema,
  QuotaResponseSchema,
} from "@chef/shared-types";

export {
  addFavoriteByRecipeId,
  listFavorites,
  listRecipes,
  recordRecipeCook,
  removeFavoriteByRecipeId,
} from "@/lib/api-client/recipes";

export async function fetchQuota(): Promise<QuotaResponse> {
  return apiFetch("/api/quota", undefined, QuotaResponseSchema);
}

export async function generateRecipe(
  body: GenerateRecipeRequest,
): Promise<GenerateRecipeResponse> {
  return apiFetch("/api/recipes", {
    method: "POST",
    body: JSON.stringify(body),
  }, GenerateRecipeResponseSchema);
}

export async function deleteRecipe(
  id: string,
): Promise<DeleteRecipeResponse> {
  return apiFetch(`/api/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, DeleteRecipeResponseSchema);
}

export type { AppliedPersonalization, GenerateRecipeResponse, QuotaResponse };
