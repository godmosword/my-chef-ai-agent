import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyPantryConsumeFromSlot,
  buildSlotConsumePreview,
} from "@/application/meal-planning/meal-plan-slot-execution";
import {
  mealPlanExecutionEnabled,
  requireMealPlanSession,
  requireSlotInPlan,
} from "@/lib/api/meal-plan-guard";

const BodySchema = z.object({
  consume_all: z.boolean().optional(),
});

type Ctx = { params: Promise<{ planId: string; slotId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const disabled = mealPlanExecutionEnabled();
  if (disabled) return disabled;
  const session = await requireMealPlanSession();
  if (session instanceof NextResponse) return session;

  const { planId: planIdStr, slotId: slotIdStr } = await ctx.params;
  const planId = parseInt(planIdStr, 10);
  const slotId = parseInt(slotIdStr, 10);
  if (!Number.isFinite(planId) || !Number.isFinite(slotId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const slotCheck = await requireSlotInPlan(
    planId,
    slotId,
    session.tenantId,
    session.userId,
  );
  if (slotCheck instanceof NextResponse) return slotCheck;

  const body = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const lines = await buildSlotConsumePreview(
    slotId,
    planId,
    session.tenantId,
    session.userId,
  );
  if (!lines) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const result = await applyPantryConsumeFromSlot(
    session.tenantId,
    session.userId,
    lines,
    { consume_all: body.data.consume_all },
  );
  return NextResponse.json({ ok: true, ...result });
}
