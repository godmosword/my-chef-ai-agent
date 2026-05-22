import type { RecipePayload } from "@/lib/ai/generate-recipe";
import { and, desc, eq } from "drizzle-orm";
import { asRows, getSql } from "./client";
import { getDb } from "./drizzle";
import { favoritesV2, recipes } from "./schema";

export type FavoriteRow = {
  id: number;
  recipe_name: string;
  recipe_data: RecipePayload;
  created_at: string;
  recipe_id?: string;
};

export type FavoriteV2Row = {
  recipe_id: string;
  title: string;
  created_at: string;
};

export async function listFavoriteRecipes(
  userId: string,
  tenantId: string,
  limit = 10,
): Promise<FavoriteRow[]> {
  const db = getDb();
  if (db) {
    const v2 = await db
      .select({
        recipeId: favoritesV2.recipeId,
        title: recipes.title,
        createdAt: favoritesV2.createdAt,
      })
      .from(favoritesV2)
      .innerJoin(recipes, eq(favoritesV2.recipeId, recipes.id))
      .where(
        and(
          eq(favoritesV2.userId, userId),
          eq(favoritesV2.tenantId, tenantId),
        ),
      )
      .orderBy(desc(favoritesV2.createdAt))
      .limit(limit);

    if (v2.length) {
      return v2.map((r, i) => ({
        id: i,
        recipe_id: r.recipeId,
        recipe_name: r.title,
        recipe_data: { recipe_name: r.title },
        created_at: r.createdAt.toISOString(),
      }));
    }
  }

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
  recipeId?: string,
): Promise<boolean> {
  const db = getDb();
  if (recipeId && db) {
    await db
      .insert(favoritesV2)
      .values({ userId, tenantId, recipeId })
      .onConflictDoNothing();
  }

  const sql = getSql();
  if (!sql) return false;

  const payload = JSON.stringify(
    recipeId ? { ...recipeData, id: recipeId } : recipeData,
  );
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

export async function deleteFavoriteByRecipeId(
  userId: string,
  tenantId: string,
  recipeId: string,
): Promise<boolean> {
  const db = getDb();
  if (db) {
    await db
      .delete(favoritesV2)
      .where(
        and(
          eq(favoritesV2.userId, userId),
          eq(favoritesV2.tenantId, tenantId),
          eq(favoritesV2.recipeId, recipeId),
        ),
      );
  }
  return true;
}

export async function insertFavoriteByRecipeId(
  userId: string,
  tenantId: string,
  recipeId: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const [row] = await db
    .select({ title: recipes.title })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, recipeId),
        eq(recipes.userId, userId),
        eq(recipes.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!row) return false;

  await db
    .insert(favoritesV2)
    .values({ userId, tenantId, recipeId })
    .onConflictDoNothing();

  await insertFavoriteRecipe(userId, tenantId, row.title, {
    recipe_name: row.title,
  }, recipeId);

  return true;
}
