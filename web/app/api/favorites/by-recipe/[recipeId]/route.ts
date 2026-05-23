import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { deleteFavoriteByRecipeId } from "@/lib/db/favorites";
import { getSessionUserId } from "@/lib/session";

type Params = { params: Promise<{ recipeId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { recipeId } = await params;
  if (!recipeId?.trim()) {
    return NextResponse.json({ ok: false, error: "Invalid recipe_id" }, { status: 400 });
  }

  await deleteFavoriteByRecipeId(userId, DEFAULT_TENANT_ID, recipeId.trim());
  return NextResponse.json({ ok: true, deleted: true });
}
