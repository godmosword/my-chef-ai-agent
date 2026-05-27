import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getRecipeForUser } from "@/platform/db/queries/recipes";
import { triggerHeroGeneration } from "@/application/hero/trigger";
import { getSessionUserId } from "@/platform/identity/session";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/** Manual hero regeneration (uses image quota). */
export async function POST(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  const recipe = await getRecipeForUser(userId, DEFAULT_TENANT_ID, id);
  if (!recipe) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  waitUntil(
    triggerHeroGeneration({
      recipeId: id,
      userId,
      tenantId: DEFAULT_TENANT_ID,
      force: true,
      recipe,
    }),
  );

  return NextResponse.json({ ok: true, hero_status: "generating" });
}
