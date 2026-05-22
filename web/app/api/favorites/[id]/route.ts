import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { deleteFavoriteRecipe } from "@/lib/db/favorites";
import { getSessionUserId } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

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

  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (!Number.isFinite(recipeId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  await deleteFavoriteRecipe(userId, DEFAULT_TENANT_ID, recipeId);
  return NextResponse.json({ ok: true });
}
