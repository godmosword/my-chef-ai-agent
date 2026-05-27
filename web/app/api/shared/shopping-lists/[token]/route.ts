import { NextResponse } from "next/server";
import { isShoppingListEnabled } from "@/platform/config/shopping-list-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getShoppingListByShareToken } from "@/platform/db/shopping-lists";
import { shoppingListToJson } from "@/lib/api/shopping-list-json";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!isShoppingListEnabled()) {
    return NextResponse.json({ error: "Disabled" }, { status: 503 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  const { token } = await ctx.params;
  const list = await getShoppingListByShareToken(token);
  if (!list) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 404 });
  }
  const json = shoppingListToJson(list);
  return NextResponse.json({
    ok: true,
    list: {
      name: json.name,
      progress: json.progress,
      sections: json.sections,
      items: json.items,
    },
  });
}
