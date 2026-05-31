import { NextResponse } from "next/server";
import { mealPlanToJson } from "@/lib/api/meal-plan-json";
import {
  requireMealPlanningSession,
  requirePlanOwnership,
} from "@/lib/api/meal-plan-guard";
import { activateMealPlan, getMealPlan } from "@/platform/db/meal-planning";

type Ctx = { params: Promise<{ planId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
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

  const existing = await getMealPlan(planId, session.tenantId, session.userId, {
    include_slots: false,
  });
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft plans can be activated" },
      { status: 409 },
    );
  }

  const activated = await activateMealPlan(
    planId,
    session.tenantId,
    session.userId,
  );
  if (!activated) {
    return NextResponse.json({ error: "Activate failed" }, { status: 500 });
  }

  const plan = await getMealPlan(planId, session.tenantId, session.userId, {
    include_slots: true,
  });

  return NextResponse.json({
    ok: true,
    plan: plan ? mealPlanToJson(plan) : mealPlanToJson(activated),
  });
}
