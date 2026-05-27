import { NextResponse } from "next/server";
import { regenerateFromPlan } from "@/application/shopping-list/shopping-list-service";
import { shoppingListToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import { getShoppingList } from "@/platform/db/shopping-lists";

type Ctx = { params: Promise<{ listId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  const id = Number(listId);
  const existing = await getShoppingList(id, session.tenantId, session.userId, {
    include_items: false,
  });
  if (!existing?.meal_plan_id) {
    return NextResponse.json({ error: "No linked meal plan" }, { status: 400 });
  }
  const list = await regenerateFromPlan(
    existing.meal_plan_id,
    session.tenantId,
    session.userId,
  );
  if (!list) {
    return NextResponse.json({ error: "Regenerate failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, list: shoppingListToJson(list) });
}
