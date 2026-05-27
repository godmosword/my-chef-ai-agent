import { NextResponse } from "next/server";
import { buildWeeklyReviewInsights } from "@/application/meal-planning/weekly-review-insights";
import {
  requireMealPlanSession,
  requirePlanOwnership,
} from "@/lib/api/meal-plan-guard";

type Ctx = { params: Promise<{ planId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await requireMealPlanSession();
  if (session instanceof NextResponse) return session;

  const { planId: planIdStr } = await ctx.params;
  const planId = parseInt(planIdStr, 10);

  const denied = await requirePlanOwnership(
    planId,
    session.tenantId,
    session.userId,
  );
  if (denied) return denied;

  const insights = await buildWeeklyReviewInsights(
    planId,
    session.tenantId,
    session.userId,
  );
  if (!insights) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, insights });
}
