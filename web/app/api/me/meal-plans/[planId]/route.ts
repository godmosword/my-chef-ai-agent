import { NextResponse } from "next/server";
import {
  computePlanSummary,
  serializePlanForClient,
} from "@/application/meal-planning/meal-plan-ui";
import {
  planForbidden,
  requireMealPlansApi,
} from "@/application/meal-planning/meal-plans-api";
import { listPantryItems } from "@/platform/db/pantry";
import { deleteMealPlan, getMealPlan } from "@/platform/db/meal-planning";

type Params = { params: Promise<{ planId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const { planId } = await params;
  const id = parseInt(planId, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const plan = await getMealPlan(id, auth.tenantId, auth.userId);
  if (!plan) return planForbidden();

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

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const { planId } = await params;
  const id = parseInt(planId, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const deleted = await deleteMealPlan(id, auth.tenantId, auth.userId);
  if (!deleted) return planForbidden();

  return NextResponse.json({ ok: true });
}
