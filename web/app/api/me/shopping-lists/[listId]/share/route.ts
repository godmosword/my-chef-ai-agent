import { NextResponse } from "next/server";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import {
  createShareToken,
  revokeShareToken,
} from "@/platform/db/shopping-lists";

type Ctx = { params: Promise<{ listId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  const id = Number(listId);
  const token = await createShareToken(id, session.tenantId, session.userId);
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return NextResponse.json({
    ok: true,
    token,
    url: `${base}/shop/${token}`,
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  const id = Number(listId);
  const ok = await revokeShareToken(id, session.tenantId, session.userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
