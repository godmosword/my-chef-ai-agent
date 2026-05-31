import { NextResponse } from "next/server";
import { deleteFavoriteRecipe } from "@/platform/db/favorites";
import { requireApiSession } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (!Number.isFinite(recipeId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  await deleteFavoriteRecipe(session.userId, session.tenantId, recipeId);
  return NextResponse.json({ ok: true });
}
