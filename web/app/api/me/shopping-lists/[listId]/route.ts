import { NextResponse } from "next/server";
import { shoppingListToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import {
  deleteShoppingList,
  getShoppingList,
} from "@/platform/db/shopping-lists";

type Ctx = { params: Promise<{ listId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  const id = Number(listId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const list = await getShoppingList(id, session.tenantId, session.userId);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, list: shoppingListToJson(list) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  const id = Number(listId);
  const ok = await deleteShoppingList(id, session.tenantId, session.userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
