import { NextResponse } from "next/server";
import { z } from "zod";
import { syncCompletedListToPantry } from "@/application/shopping-list/sync-to-pantry";
import { shoppingListToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import { completeShoppingList } from "@/platform/db/shopping-lists";
import { recordShoppingListComplete } from "@/platform/observability/shopping-list-metrics";

type Ctx = { params: Promise<{ listId: string }> };

const Body = z.object({
  actual_total_cost: z.number().optional(),
  include_unchecked: z.boolean().optional(),
});

export async function POST(request: Request, ctx: Ctx) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  const id = Number(listId);
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
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
