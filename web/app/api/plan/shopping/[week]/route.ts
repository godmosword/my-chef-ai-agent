import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { aggregateShoppingList } from "@/lib/aggregation/shopping-list";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getSessionUserId } from "@/lib/session";
import { floorToWeekMonday } from "@/lib/locale/week";

type RouteContext = { params: Promise<{ week: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  const { week } = await context.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return NextResponse.json({ ok: false, error: "Invalid week" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const list = await aggregateShoppingList(userId, DEFAULT_TENANT_ID, week);
  return NextResponse.json({ ok: true, ...list, week_of: floorToWeekMonday(week) });
}
