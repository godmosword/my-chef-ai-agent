import { apiFetch } from "./client";
import type { AppliedPersonalization } from "@/application/personalization/applied-personalization";
import type { GenerateRecipeRequest, RecipePayload } from "@chef/shared-types";

export {
  addFavoriteByRecipeId,
  listFavorites,
  listRecipes,
  recordRecipeCook,
  removeFavoriteByRecipeId,
} from "@/lib/api-client/recipes";

export type QuotaResponse = {
  ok: true;
  db_configured: boolean;
  text: { used: number; limit: number; remaining: number };
  image: { used: number; limit: number; remaining: number };
};

export type GenerateRecipeResponse = {
  ok: true;
  recipe: RecipePayload;
  applied_personalization?: AppliedPersonalization | null;
  suggest_onboarding?: boolean;
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

export async function generateRecipe(
  body: GenerateRecipeRequest,
): Promise<GenerateRecipeResponse> {
  return apiFetch<GenerateRecipeResponse>("/api/recipes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteRecipe(
  id: string,
): Promise<{ ok: true; deleted: true }> {
  return apiFetch(`/api/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
