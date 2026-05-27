import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { upsertMealPlanSlot } from "@/platform/db/queries/meal-plans";
import { getSessionUserId } from "@/platform/identity/session";
import { PutMealPlanSlotSchema, SlotEnum } from "@chef/shared-types";

type RouteContext = { params: Promise<{ date: string; slot: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  const { date, slot: slotRaw } = await context.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
  }

  const slotParsed = SlotEnum.safeParse(slotRaw);
  if (!slotParsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid slot" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PutMealPlanSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const slotState = await upsertMealPlanSlot(
    userId,
    DEFAULT_TENANT_ID,
    date,
    slotParsed.data,
    parsed.data,
  );

  if (!slotState) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, slot: slotState });
}
