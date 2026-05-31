import { NextResponse } from "next/server";
import { addRecipeTag } from "@/platform/db/queries/recipes";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";
import { AddTagRequestSchema } from "@chef/shared-types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = AddTagRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ok = await addRecipeTag(
    session.userId,
    session.tenantId,
    id,
    parsed.data.tag,
  );
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
