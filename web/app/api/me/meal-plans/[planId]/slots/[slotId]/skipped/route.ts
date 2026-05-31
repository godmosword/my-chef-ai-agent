import { NextResponse } from "next/server";
import { MealPlanSlotSkippedSchema } from "@/domain/meal-planning/meal-plan-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { markSlotSkippedWithReason } from "@/application/meal-planning/meal-plan-slot-execution";
import {
  requireMealPlanSlotRoute,
  requireSlotInPlan,
  type MealPlanSlotRouteContext,
} from "@/lib/api/meal-plan-guard";

export async function POST(request: Request, ctx: MealPlanSlotRouteContext) {
  const route = await requireMealPlanSlotRoute(ctx);
  if (route instanceof NextResponse) return route;
  const { session, planId, slotId } = route;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = MealPlanSlotSkippedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slotCheck = await requireSlotInPlan(
    planId,
    slotId,
    session.tenantId,
    session.userId,
  );
  if (slotCheck instanceof NextResponse) return slotCheck;

  const slot = await markSlotSkippedWithReason(
    slotId,
    session.tenantId,
    session.userId,
    parsed.data.reason,
  );
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, slot });
}
