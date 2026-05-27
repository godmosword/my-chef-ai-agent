import { NextResponse } from "next/server";
import { z } from "zod";
import { markSlotSkippedWithReason } from "@/application/meal-planning/meal-plan-slot-execution";
import {
  mealPlanExecutionEnabled,
  requireMealPlanSession,
  requirePlanOwnership,
} from "@/lib/api/meal-plan-guard";

const BodySchema = z.object({ reason: z.string().min(1).max(64) });

type Ctx = { params: Promise<{ planId: string; slotId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const disabled = mealPlanExecutionEnabled();
  if (disabled) return disabled;
  const session = await requireMealPlanSession();
  if (session instanceof NextResponse) return session;

  const { planId: planIdStr, slotId: slotIdStr } = await ctx.params;
  const planId = parseInt(planIdStr, 10);
  const slotId = parseInt(slotIdStr, 10);

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const denied = await requirePlanOwnership(
    planId,
    session.tenantId,
    session.userId,
  );
  if (denied) return denied;

  const slot = await markSlotSkippedWithReason(
    slotId,
    session.tenantId,
    session.userId,
    body.data.reason,
  );
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, slot });
}
