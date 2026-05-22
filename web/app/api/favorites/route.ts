import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import type { RecipePayload } from "@/lib/ai/generate-recipe";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  insertFavoriteByRecipeId,
  insertFavoriteRecipe,
  listFavoriteRecipes,
} from "@/lib/db/favorites";
import { getSessionUserId } from "@/lib/session";
import {
  FavoriteByRecipeIdSchema,
  LegacyFavoriteSchema,
} from "@chef/shared-types";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, items: [], db_configured: false });
  }
  const items = await listFavoriteRecipes(userId, DEFAULT_TENANT_ID);
  return NextResponse.json({ ok: true, items, db_configured: true });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "收藏需要設定 DATABASE_URL（Neon Postgres）" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const byId = FavoriteByRecipeIdSchema.safeParse(body);
  if (byId.success) {
    const ok = await insertFavoriteByRecipeId(
      userId,
      DEFAULT_TENANT_ID,
      byId.data.recipe_id,
    );
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Recipe not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, saved: true, recipe_id: byId.data.recipe_id });
  }

  const legacy = LegacyFavoriteSchema.safeParse(body);
  if (!legacy.success) {
    return NextResponse.json(
      { ok: false, error: "recipe_id or recipe_name+recipe_data required" },
      { status: 400 },
    );
  }

  const name = (legacy.data.recipe_name || "").trim();
  const data = legacy.data.recipe_data as RecipePayload | undefined;
  if (!name || !data) {
    return NextResponse.json(
      { ok: false, error: "recipe_name and recipe_data required" },
      { status: 400 },
    );
  }

  const recipeId =
    typeof (data as { id?: string }).id === "string"
      ? (data as { id: string }).id
      : undefined;

  const ok = await insertFavoriteRecipe(
    userId,
    DEFAULT_TENANT_ID,
    name,
    data,
    recipeId,
  );
  return NextResponse.json({ ok: true, saved: ok });
}
