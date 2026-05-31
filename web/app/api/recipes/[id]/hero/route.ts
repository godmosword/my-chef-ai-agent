import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getRecipeForUser } from "@/platform/db/queries/recipes";
import { triggerHeroGeneration } from "@/application/hero/trigger";
import { requireApiSession } from "@/lib/api/route-helpers";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/** Manual hero regeneration (uses image quota). */
export async function POST(_request: Request, context: RouteContext) {
  const session = await requireApiSession({
    databaseError: "Database not configured",
  });
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const recipe = await getRecipeForUser(session.userId, session.tenantId, id);
  if (!recipe) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  waitUntil(
    triggerHeroGeneration({
      recipeId: id,
      userId: session.userId,
      tenantId: session.tenantId,
      force: true,
      recipe,
    }).catch((err) => {
      console.error(
        "[recipe-hero] generation failed",
        err instanceof Error ? err.message : err,
      );
    }),
  );

  return NextResponse.json({ ok: true, hero_status: "generating" });
}
