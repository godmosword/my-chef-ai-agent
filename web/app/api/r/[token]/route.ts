import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getPublicRecipeByToken } from "@/lib/db/queries/sharing";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { token } = await context.params;
  const recipe = await getPublicRecipeByToken(token);
  if (!recipe) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...recipe });
}
