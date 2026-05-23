import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  publishRecipeShare,
  republishRecipeShare,
  revokeRecipeShare,
} from "@/lib/db/queries/sharing";
import { buildShareUrl } from "@/lib/site-url";
import { getSessionUserId } from "@/lib/session";
import { z } from "zod";

const RepublishSchema = z.object({
  republish: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  let republish = false;
  try {
    const body = await request.json();
    const parsed = RepublishSchema.safeParse(body);
    if (parsed.success) republish = parsed.data.republish === true;
  } catch {
    /* empty body */
  }

  const shareUrl = (token: string) => buildShareUrl(token);
  const meta = republish
    ? await republishRecipeShare(userId, DEFAULT_TENANT_ID, id, shareUrl)
    : await publishRecipeShare(userId, DEFAULT_TENANT_ID, id, shareUrl);

  if (!meta) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...meta });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const ok = await revokeRecipeShare(userId, DEFAULT_TENANT_ID, id);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
