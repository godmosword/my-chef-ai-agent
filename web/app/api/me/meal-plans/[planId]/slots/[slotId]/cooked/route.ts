import { NextResponse } from "next/server";
import { markSlotCookedWithEngagement } from "@/application/meal-planning/meal-plan-slot-execution";
import {
  requireMealPlanSlotInPlanRoute,
  type MealPlanSlotRouteContext,
} from "@/lib/api/meal-plan-guard";

export async function POST(_request: Request, ctx: MealPlanSlotRouteContext) {
  const route = await requireMealPlanSlotInPlanRoute(ctx, {
    rejectInvalidIds: true,
  });
  if (route instanceof NextResponse) return route;
  const { session, slotId } = route;

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
