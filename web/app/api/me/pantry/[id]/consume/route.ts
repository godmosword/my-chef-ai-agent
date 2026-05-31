import { NextResponse } from "next/server";
import { PantryConsumeSchema } from "@/domain/pantry/pantry-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
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
  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = PantryConsumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "amount or full required", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.full) {
      const result = await consumePantryItem(itemId, DEFAULT_TENANT_ID, userId, {});
      recordPantryConsume("button");
      return NextResponse.json({ item: result });
    }
    const result = await consumePantryItem(itemId, DEFAULT_TENANT_ID, userId, {
      amount: parsed.data.amount!,
      unit: parsed.data.unit,
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
