import { NextResponse } from "next/server";
import { isShoppingListEnabled } from "@/platform/config/shopping-list-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { getSessionUserId } from "@/platform/identity/session";

type ShoppingSession = { userId: string; tenantId: string };

export type ShoppingListRouteContext = {
  params: Promise<{ listId: string }>;
};

export async function requireShoppingSession(): Promise<
  ShoppingSession | NextResponse
> {
  if (!isShoppingListEnabled()) {
    return NextResponse.json({ error: "Shopping list disabled" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }
  return { userId, tenantId: DEFAULT_TENANT_ID };
}

export async function requireShoppingListRoute(
  ctx: ShoppingListRouteContext,
): Promise<{ session: ShoppingSession; listId: number } | NextResponse> {
  const session = await requireShoppingSession();
  if (session instanceof NextResponse) return session;
  const { listId } = await ctx.params;
  return { session, listId: Number(listId) };
}
