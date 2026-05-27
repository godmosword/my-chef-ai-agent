import { NextResponse } from "next/server";
import {
  computePlanSummary,
  serializePlanForClient,
} from "@/application/meal-planning/meal-plan-ui";
import { requireMealPlansApi } from "@/application/meal-planning/meal-plans-api";
import { listPantryItems } from "@/platform/db/pantry";
import { getActiveMealPlan } from "@/platform/db/meal-planning";

export async function GET() {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const plan = await getActiveMealPlan(auth.tenantId, auth.userId);
  if (!plan) {
    return NextResponse.json({ ok: true, plan: null });
  }

  const pantry = await listPantryItems(auth.tenantId, auth.userId, {
    include_expired: false,
    min_confidence: 0.5,
  });

  return NextResponse.json({
    ok: true,
    plan: serializePlanForClient(plan),
    summary: computePlanSummary(plan, pantry.length),
  });
}
