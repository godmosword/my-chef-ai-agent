import { NextResponse } from "next/server";
import { CheckShoppingItemSchema } from "@/domain/shopping-list/shopping-list-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { itemToJson } from "@/lib/api/shopping-list-json";
import { isShoppingListEnabled, shoppingSharedCheckRateLimitPerMin } from "@/platform/config/shopping-list-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { checkItemViaShareToken } from "@/platform/db/shopping-lists";
import { recordShoppingListCheck } from "@/platform/observability/shopping-list-metrics";

type Ctx = { params: Promise<{ token: string; itemId: string }> };

const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimitOk(token: string): boolean {
  const limit = shoppingSharedCheckRateLimitPerMin();
  const now = Date.now();
  const entry = hits.get(token);
  if (!entry || now - entry.windowStart > 60_000) {
    hits.set(token, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request, ctx: Ctx) {
  if (!isShoppingListEnabled() || !isDatabaseConfigured()) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  const { token, itemId } = await ctx.params;
  if (!rateLimitOk(token)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const body = await readJsonBody(request);
  const parsed =
    body instanceof NextResponse
      ? CheckShoppingItemSchema.safeParse({ checked: true })
      : CheckShoppingItemSchema.safeParse(body);
  const checked = parsed.success ? parsed.data.checked : true;
  const item = await checkItemViaShareToken(token, Number(itemId), checked);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  recordShoppingListCheck("shared");
  return NextResponse.json({ ok: true, item: itemToJson(item) });
}
