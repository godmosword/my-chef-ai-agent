import { NextResponse } from "next/server";
import { CheckShoppingItemSchema } from "@/domain/shopping-list/shopping-list-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { itemToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import { checkShoppingItem } from "@/platform/db/shopping-lists";
import { recordShoppingListCheck } from "@/platform/observability/shopping-list-metrics";

type Ctx = { params: Promise<{ listId: string; itemId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { itemId } = await ctx.params;
  const id = Number(itemId);
  const body = await readJsonBody(request);
  const parsed =
    body instanceof NextResponse
      ? CheckShoppingItemSchema.safeParse({ checked: true })
      : CheckShoppingItemSchema.safeParse(body);
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
