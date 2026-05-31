import { NextResponse } from "next/server";
import { CreateShoppingListSchema } from "@/domain/shopping-list/shopping-list-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { regenerateFromPlan } from "@/application/shopping-list/shopping-list-service";
import { shoppingListToJson } from "@/lib/api/shopping-list-json";
import { requireShoppingSession } from "@/lib/api/shopping-list-guard";
import {
  activateShoppingList,
  createShoppingList,
  listShoppingLists,
} from "@/platform/db/shopping-lists";

export async function GET(request: Request) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const lists = await listShoppingLists(session.tenantId, session.userId, {
    status_filter: status as "draft" | "active" | "completed" | "abandoned" | undefined,
    limit: 20,
  });
  return NextResponse.json({
    ok: true,
    lists: lists.map((l) => shoppingListToJson({ ...l, items: [] })),
  });
}

export async function POST(request: Request) {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = CreateShoppingListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (parsed.data.meal_plan_id) {
    const list = await regenerateFromPlan(
      parsed.data.meal_plan_id,
      session.tenantId,
      session.userId,
    );
    if (!list) {
      return NextResponse.json({ error: "Could not build list" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, list: shoppingListToJson(list) });
  }

  const created = await createShoppingList(session.tenantId, session.userId, {
    name: parsed.data.name ?? "手動採買清單",
    status: "draft",
  });
  if (!created) {
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
  const active = await activateShoppingList(
    created.id,
    session.tenantId,
    session.userId,
  );
  return NextResponse.json({
    ok: true,
    list: shoppingListToJson(active ?? created),
  });
}
