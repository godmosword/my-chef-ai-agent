import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { addRecipeTag } from "@/lib/db/queries/recipes";
import { getSessionUserId } from "@/lib/session";
import { AddTagRequestSchema } from "@chef/shared-types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AddTagRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ok = await addRecipeTag(
    userId,
    DEFAULT_TENANT_ID,
    id,
    parsed.data.tag,
  );
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
