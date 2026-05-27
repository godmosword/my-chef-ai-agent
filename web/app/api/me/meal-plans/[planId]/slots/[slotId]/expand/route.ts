import { NextResponse } from "next/server";
import { expandSlotToFullRecipe } from "@/application/meal-planning/meal-planner-expansion";
import { serializeSlotForClient } from "@/application/meal-planning/meal-plan-ui";
import {
  planForbidden,
  requireMealPlansApi,
} from "@/application/meal-planning/meal-plans-api";
import { getMealSlot } from "@/platform/db/meal-planning";

type Params = { params: Promise<{ planId: string; slotId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const { planId, slotId } = await params;
  const pid = parseInt(planId, 10);
  const sid = parseInt(slotId, 10);
  const existing = await getMealSlot(sid, auth.tenantId, auth.userId);
  if (!existing || existing.meal_plan_id !== pid) return planForbidden();

  try {
    const slot = await expandSlotToFullRecipe(sid, auth.tenantId, auth.userId);
    if (!slot) return planForbidden();
    return NextResponse.json({
      ok: true,
      slot: serializeSlotForClient(slot),
      recipe: slot.full_recipe_json,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Expand failed",
      },
      { status: 500 },
    );
  }
}
