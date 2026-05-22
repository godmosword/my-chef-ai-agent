import type { RecipePayload } from "@/lib/ai/generate-recipe";
import { asRows, getSql } from "./client";

export type FavoriteRow = {
  id: number;
  recipe_name: string;
  recipe_data: RecipePayload;
  created_at: string;
};

export async function listFavoriteRecipes(
  userId: string,
  tenantId: string,
  limit = 10,
): Promise<FavoriteRow[]> {
  const sql = getSql();
  if (!sql) return [];

  const rows = await sql`
    SELECT id, recipe_name, recipe_data, created_at
    FROM favorite_recipes
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return asRows<Record<string, unknown>>(rows).map((r) => ({
    id: Number(r.id),
    recipe_name: String(r.recipe_name),
    recipe_data:
      typeof r.recipe_data === "string"
        ? (JSON.parse(r.recipe_data) as RecipePayload)
        : (r.recipe_data as RecipePayload),
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at ?? ""),
  }));
}

export async function insertFavoriteRecipe(
  userId: string,
  tenantId: string,
  recipeName: string,
  recipeData: RecipePayload,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  const payload = JSON.stringify(recipeData);
  await sql`
    INSERT INTO favorite_recipes (tenant_id, user_id, recipe_name, recipe_data)
    VALUES (${tenantId}, ${userId}, ${recipeName}, ${payload}::jsonb)
  `;
  return true;
}

export async function deleteFavoriteRecipe(
  userId: string,
  tenantId: string,
  recipeId: number,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;

  await sql`
    DELETE FROM favorite_recipes
    WHERE id = ${recipeId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  return true;
}
