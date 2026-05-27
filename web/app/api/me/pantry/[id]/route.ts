import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  deletePantryItem,
  getPantryItem,
  updatePantryItem,
} from "@/platform/db/pantry";
import { getSessionUserId } from "@/platform/identity/session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await request.json();
  const updated = await updatePantryItem(itemId, DEFAULT_TENANT_ID, userId, body);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const itemId = parseInt(id, 10);
  const ok = await deletePantryItem(itemId, DEFAULT_TENANT_ID, userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
