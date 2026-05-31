import { NextResponse } from "next/server";
import { getRecipeHeroStatus } from "@/platform/db/queries/recipes";
import { requireApiSession } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireApiSession({
    databaseError: "Database not configured",
  });
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const row = await getRecipeHeroStatus(session.userId, session.tenantId, id);
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
