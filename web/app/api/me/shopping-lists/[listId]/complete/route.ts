import { NextResponse } from "next/server";
import { CompleteShoppingListSchema } from "@/domain/shopping-list/shopping-list-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { syncCompletedListToPantry } from "@/application/shopping-list/sync-to-pantry";
import { shoppingListToJson } from "@/lib/api/shopping-list-json";
import {
  requireShoppingListRoute,
  type ShoppingListRouteContext,
} from "@/lib/api/shopping-list-guard";
import { completeShoppingList } from "@/platform/db/shopping-lists";
import { recordShoppingListComplete } from "@/platform/observability/shopping-list-metrics";

export async function POST(request: Request, ctx: ShoppingListRouteContext) {
  const route = await requireShoppingListRoute(ctx);
  if (route instanceof NextResponse) return route;
  const { session, listId: id } = route;
  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = CompleteShoppingListSchema.safeParse(body);
  const list = await completeShoppingList(
    id,
    session.tenantId,
    session.userId,
    parsed.success ? parsed.data.actual_total_cost : undefined,
  );
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sync = await syncCompletedListToPantry(
    id,
    session.tenantId,
    session.userId,
    { include_unchecked: parsed.success && parsed.data.include_unchecked },
  );
  recordShoppingListComplete();

  const full = await import("@/platform/db/shopping-lists").then((m) =>
    m.getShoppingList(id, session.tenantId, session.userId),
  );
  return NextResponse.json({
    ok: true,
    list: full ? shoppingListToJson(full) : shoppingListToJson(list),
    pantry_sync: sync,
  });
}
