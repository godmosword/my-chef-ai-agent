import { NextResponse } from "next/server";
import { AddShoppingItemSchema } from "@/domain/shopping-list/shopping-list-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { itemToJson, shoppingListToJson } from "@/lib/api/shopping-list-json";
import {
  requireShoppingListRoute,
  type ShoppingListRouteContext,
} from "@/lib/api/shopping-list-guard";
import {
  addShoppingItem,
  getShoppingList,
} from "@/platform/db/shopping-lists";

export async function POST(request: Request, ctx: ShoppingListRouteContext) {
  const route = await requireShoppingListRoute(ctx);
  if (route instanceof NextResponse) return route;
  const { session, listId: id } = route;
  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = AddShoppingItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const list = await getShoppingList(id, session.tenantId, session.userId, {
    include_items: false,
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await addShoppingItem(id, session.tenantId, session.userId, {
    raw_name: parsed.data.raw_name,
    raw_quantity: parsed.data.raw_quantity,
    raw_unit: parsed.data.raw_unit,
    section: parsed.data.section as never,
    notes: parsed.data.notes,
  });
  if (!item) {
    return NextResponse.json({ error: "Add failed" }, { status: 500 });
  }
  const full = await getShoppingList(id, session.tenantId, session.userId);
  return NextResponse.json({
    ok: true,
    item: itemToJson(item),
    list: full ? shoppingListToJson(full) : null,
  });
}
