import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeSlotForClient } from "@/application/meal-planning/meal-plan-ui";
import {
  planForbidden,
  requireMealPlansApi,
} from "@/application/meal-planning/meal-plans-api";
import {
  getMealSlot,
  markSlotSkipped,
  updateMealSlot,
} from "@/platform/db/meal-planning";

type Params = { params: Promise<{ planId: string; slotId: string }> };

const patchSchema = z.object({
  dish_title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["planned", "skipped"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const { planId, slotId } = await params;
  const pid = parseInt(planId, 10);
  const sid = parseInt(slotId, 10);
  if (!Number.isFinite(pid) || !Number.isFinite(sid)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const existing = await getMealSlot(sid, auth.tenantId, auth.userId);
  if (!existing || existing.meal_plan_id !== pid) return planForbidden();

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (body.status === "skipped") {
    const slot = await markSlotSkipped(
      sid,
      auth.tenantId,
      auth.userId,
      body.notes ?? undefined,
    );
    return NextResponse.json({
      ok: true,
      slot: slot ? serializeSlotForClient(slot) : null,
    });
  }

  const patch: Parameters<typeof updateMealSlot>[3] = {};
  if (body.dish_title !== undefined) patch.dish_title = body.dish_title;
  if (body.notes !== undefined) patch.notes = body.notes ?? undefined;

  const slot = await updateMealSlot(sid, auth.tenantId, auth.userId, patch);

  if (!slot) return planForbidden();

  return NextResponse.json({ ok: true, slot: serializeSlotForClient(slot) });
}
