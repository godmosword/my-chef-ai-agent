import { NextResponse } from "next/server";
import { deleteFavoriteByRecipeId } from "@/platform/db/favorites";
import { requireApiSession } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ recipeId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { recipeId } = await params;
  if (!recipeId?.trim()) {
    return NextResponse.json({ ok: false, error: "Invalid recipe_id" }, { status: 400 });
  }

  await deleteFavoriteByRecipeId(
    session.userId,
    session.tenantId,
    recipeId.trim(),
  );
  return NextResponse.json({ ok: true, deleted: true });
}
