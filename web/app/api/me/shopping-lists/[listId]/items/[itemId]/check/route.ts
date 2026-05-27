import { NextResponse } from "next/server";
import { z } from "zod";
import { itemToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import { checkShoppingItem } from "@/platform/db/shopping-lists";
import { recordShoppingListCheck } from "@/platform/observability/shopping-list-metrics";

type Ctx = { params: Promise<{ listId: string; itemId: string }> };

const Body = z.object({ checked: z.boolean().default(true) });

export async function POST(request: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { itemId } = await ctx.params;
  const id = Number(itemId);
  const parsed = Body.safeParse(await request.json().catch(() => ({ checked: true })));
  const checked = parsed.success ? parsed.data.checked : true;
  const item = await checkShoppingItem(
    id,
    session.tenantId,
    session.userId,
    checked,
  );
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  recordShoppingListCheck("web");
  return NextResponse.json({ ok: true, item: itemToJson(item) });
}
