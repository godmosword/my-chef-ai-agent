import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getRecipeHeroStatus } from "@/lib/db/queries/recipes";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  const row = await getRecipeHeroStatus(userId, DEFAULT_TENANT_ID, id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const cacheControl =
    row.hero_status === "ready"
      ? "private, max-age=300"
      : "no-cache, no-store";

  return NextResponse.json(
    {
      ok: true,
      hero_status: row.hero_status,
      hero_url: row.hero_url,
      hero_error: row.hero_error,
    },
    { headers: { "Cache-Control": cacheControl } },
  );
}
