import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import type { RecipePayload } from "@/lib/ai/generate-recipe";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  insertFavoriteRecipe,
  listFavoriteRecipes,
} from "@/lib/db/favorites";
import { getSessionUserId } from "@/lib/session";

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

  let body: { recipe_name?: string; recipe_data?: RecipePayload };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.recipe_name || "").trim();
  const data = body.recipe_data;
  if (!name || !data) {
    return NextResponse.json(
      { ok: false, error: "recipe_name and recipe_data required" },
      { status: 400 },
    );
  }

  const ok = await insertFavoriteRecipe(userId, DEFAULT_TENANT_ID, name, data);
  return NextResponse.json({ ok: true, saved: ok });
}
