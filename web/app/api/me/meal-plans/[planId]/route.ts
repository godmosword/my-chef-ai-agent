import { NextResponse } from "next/server";
import { mealPlanToJson } from "@/lib/api/meal-plan-json";
import {
  requireMealPlanningSession,
  requirePlanOwnership,
} from "@/lib/api/meal-plan-guard";
import { getMealPlan } from "@/platform/db/meal-planning";

type Ctx = { params: Promise<{ planId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await requireMealPlanningSession();
  if (session instanceof NextResponse) return session;

  const { planId: planIdStr } = await ctx.params;
  const planId = parseInt(planIdStr, 10);
  if (!Number.isFinite(planId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const denied = await requirePlanOwnership(
    planId,
    session.tenantId,
    session.userId,
  );
  if (denied) return denied;

  const plan = await getMealPlan(planId, session.tenantId, session.userId, {
    include_slots: true,
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, plan: mealPlanToJson(plan) });
}
