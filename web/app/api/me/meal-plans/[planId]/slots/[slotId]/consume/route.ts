import { NextResponse } from "next/server";
import { MealPlanSlotConsumeSchema } from "@/domain/meal-planning/meal-plan-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import {
  applyPantryConsumeFromSlot,
  buildSlotConsumePreview,
} from "@/application/meal-planning/meal-plan-slot-execution";
import {
  requireMealPlanSlotInPlanRoute,
  type MealPlanSlotRouteContext,
} from "@/lib/api/meal-plan-guard";

export async function POST(request: Request, ctx: MealPlanSlotRouteContext) {
  const route = await requireMealPlanSlotInPlanRoute(ctx, {
    rejectInvalidIds: true,
  });
  if (route instanceof NextResponse) return route;
  const { session, planId, slotId } = route;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = MealPlanSlotConsumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
    { consume_all: parsed.data.consume_all },
  );
  return NextResponse.json({ ok: true, ...result });
}
