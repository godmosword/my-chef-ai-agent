import { NextResponse } from "next/server";
import { isShoppingListEnabled } from "@/platform/config/shopping-list-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { getSessionUserId } from "@/platform/identity/session";

export async function requireShoppingSession(): Promise<
  | { userId: string; tenantId: string }
  | NextResponse
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
