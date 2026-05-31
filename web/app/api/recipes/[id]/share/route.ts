import { NextResponse } from "next/server";
import { RecipeShareRepublishSchema } from "@/domain/recipe/recipe-api-schemas";
import {
  publishRecipeShare,
  republishRecipeShare,
  revokeRecipeShare,
} from "@/platform/db/queries/sharing";
import { buildShareUrl } from "@/platform/config/site-url";
import { requireApiSession } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  let republish = false;
  try {
    const body = await request.json();
    const parsed = RecipeShareRepublishSchema.safeParse(body);
    if (parsed.success) republish = parsed.data.republish === true;
  } catch {
    /* empty body */
  }

  const shareUrl = (token: string) => buildShareUrl(token);
  const meta = republish
    ? await republishRecipeShare(session.userId, session.tenantId, id, shareUrl)
    : await publishRecipeShare(session.userId, session.tenantId, id, shareUrl);

  if (!meta) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...meta });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const ok = await revokeRecipeShare(session.userId, session.tenantId, id);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
