import { NextResponse } from "next/server";
import { serializePlanForClient } from "@/application/meal-planning/meal-plan-ui";
import {
  planForbidden,
  requireMealPlansApi,
} from "@/application/meal-planning/meal-plans-api";
import { abandonMealPlan } from "@/platform/db/meal-planning";

type Params = { params: Promise<{ planId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const { planId } = await params;
  const id = parseInt(planId, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const plan = await abandonMealPlan(id, auth.tenantId, auth.userId);
  if (!plan) return planForbidden();

  return NextResponse.json({
    ok: true,
    plan: serializePlanForClient(plan),
  });
}
