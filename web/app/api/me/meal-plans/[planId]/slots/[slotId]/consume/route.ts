import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyPantryConsumeFromSlot,
  type ConsumeLine,
} from "@/application/meal-planning/meal-plan-slot-execution";
import {
  mealPlanExecutionEnabled,
  requireMealPlanSession,
  requirePlanOwnership,
} from "@/lib/api/meal-plan-guard";

const BodySchema = z.object({
  lines: z.array(
    z.object({
      pantry_item_id: z.number().nullable(),
      item_key: z.string(),
      display_name: z.string(),
      approx_quantity: z.number().nullable(),
      approx_unit: z.string().nullable(),
      auto_tick: z.boolean(),
    }),
  ),
  consume_all: z.boolean().optional(),
});

type Ctx = { params: Promise<{ planId: string; slotId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const disabled = mealPlanExecutionEnabled();
  if (disabled) return disabled;
  const session = await requireMealPlanSession();
  if (session instanceof NextResponse) return session;

  const { planId: planIdStr } = await ctx.params;
  const planId = parseInt(planIdStr, 10);

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

  const result = await applyPantryConsumeFromSlot(
    session.tenantId,
    session.userId,
    body.data.lines as ConsumeLine[],
    { consume_all: body.data.consume_all },
  );
  return NextResponse.json({ ok: true, ...result });
}
