import { NextResponse } from "next/server";
import { z } from "zod";
import { itemToJson, shoppingListToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import {
  addShoppingItem,
  getShoppingList,
} from "@/platform/db/shopping-lists";

type Ctx = { params: Promise<{ listId: string }> };

const Body = z.object({
  raw_name: z.string().min(1),
  raw_quantity: z.union([z.string(), z.number()]).optional(),
  raw_unit: z.string().optional(),
  section: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  const id = Number(listId);
  const parsed = Body.safeParse(await request.json());
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
