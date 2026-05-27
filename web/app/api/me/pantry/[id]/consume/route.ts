import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { consumePantryItem } from "@/platform/db/pantry";
import { getSessionUserId } from "@/platform/identity/session";
import { recordPantryConsume } from "@/platform/observability/pantry-metrics";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  const body = (await request.json()) as {
    full?: boolean;
    amount?: number;
    unit?: string;
  };

  try {
    if (body.full) {
      const result = await consumePantryItem(itemId, DEFAULT_TENANT_ID, userId, {});
      recordPantryConsume("button");
      return NextResponse.json({ item: result });
    }
    if (body.amount == null) {
      return NextResponse.json({ error: "amount or full required" }, { status: 400 });
    }
    const result = await consumePantryItem(itemId, DEFAULT_TENANT_ID, userId, {
      amount: body.amount,
      unit: body.unit,
    });
    recordPantryConsume("button");
    return NextResponse.json({ item: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "consume failed";
    if (msg.includes("incompatible")) {
      return NextResponse.json(
        { error: "單位無法換算，請用相同單位或選擇全部用完" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
