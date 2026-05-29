import { NextResponse } from "next/server";
import { markSlotCookedWithEngagement } from "@/application/meal-planning/meal-plan-slot-execution";
import {
  mealPlanExecutionEnabled,
  requireMealPlanSession,
  requireSlotInPlan,
} from "@/lib/api/meal-plan-guard";

type Ctx = { params: Promise<{ planId: string; slotId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
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

  const { slot, consume_preview } = await markSlotCookedWithEngagement(
    slotId,
    session.tenantId,
    session.userId,
  );
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, slot, consume_preview });
}
