import { NextResponse } from "next/server";
import { shoppingListToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import { getActiveMealPlan } from "@/platform/db/meal-planning";
import {
  getActiveListForPlan,
  listShoppingLists,
} from "@/platform/db/shopping-lists";

export async function GET() {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;

  const activePlan = await getActiveMealPlan(session.tenantId, session.userId);
  if (activePlan) {
    const list = await getActiveListForPlan(
      activePlan.id,
      session.tenantId,
      session.userId,
    );
    if (list) {
      return NextResponse.json({ ok: true, list: shoppingListToJson(list) });
    }
  }

  const lists = await listShoppingLists(session.tenantId, session.userId, {
    status_filter: "active",
    limit: 1,
  });
  if (lists[0]) {
    const { getShoppingList } = await import("@/platform/db/shopping-lists");
    const full = await getShoppingList(
      lists[0].id,
      session.tenantId,
      session.userId,
    );
    if (full) {
      return NextResponse.json({ ok: true, list: shoppingListToJson(full) });
    }
  }

  return NextResponse.json({ ok: true, list: null });
}
