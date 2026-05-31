import { NextResponse } from "next/server";
import { CUISINE_OPTIONS, cuisineLabel } from "@/domain/recipe/cuisines";
import {
  getUserCuisineContext,
  updateUserCuisineContext,
} from "@/platform/db/cuisine";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  readJsonBody,
  requireApiSession,
} from "@/lib/api/route-helpers";

export async function GET() {
  const session = await requireApiSession({ requireDatabase: false });
  if (session instanceof NextResponse) return session;

  const ctx = await getUserCuisineContext(session.userId, session.tenantId);
  return NextResponse.json({
    ok: true,
    db_configured: isDatabaseConfigured(),
    active_cuisine: ctx.active_cuisine,
    label: cuisineLabel(ctx.active_cuisine),
    options: CUISINE_OPTIONS,
  });
}

export async function PUT(request: Request) {
  const session = await requireApiSession({
    databaseError: "菜系情境需要 DATABASE_URL",
  });
  if (session instanceof NextResponse) return session;

  const json = await readJsonBody(request);
  if (json instanceof NextResponse) return json;
  const body = json as { cuisine?: string };

  const cuisine = (body.cuisine || "").trim();
  if (!cuisine) {
    return NextResponse.json(
      { ok: false, error: "cuisine required" },
      { status: 400 },
    );
  }

  await updateUserCuisineContext(session.userId, session.tenantId, cuisine);
  return NextResponse.json({
    ok: true,
    active_cuisine: cuisine,
    label: cuisineLabel(cuisine),
  });
}
