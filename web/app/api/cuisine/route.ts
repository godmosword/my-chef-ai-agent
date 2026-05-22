import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { CUISINE_OPTIONS, cuisineLabel } from "@/lib/cuisines";
import {
  getUserCuisineContext,
  updateUserCuisineContext,
} from "@/lib/db/cuisine";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  const ctx = await getUserCuisineContext(userId, DEFAULT_TENANT_ID);
  return NextResponse.json({
    ok: true,
    db_configured: isDatabaseConfigured(),
    active_cuisine: ctx.active_cuisine,
    label: cuisineLabel(ctx.active_cuisine),
    options: CUISINE_OPTIONS,
  });
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "菜系情境需要 DATABASE_URL" },
      { status: 503 },
    );
  }

  let body: { cuisine?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const cuisine = (body.cuisine || "").trim();
  if (!cuisine) {
    return NextResponse.json({ ok: false, error: "cuisine required" }, { status: 400 });
  }

  await updateUserCuisineContext(userId, DEFAULT_TENANT_ID, cuisine);
  return NextResponse.json({
    ok: true,
    active_cuisine: cuisine,
    label: cuisineLabel(cuisine),
  });
}
