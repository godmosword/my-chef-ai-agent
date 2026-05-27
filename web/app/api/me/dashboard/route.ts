import { NextResponse } from "next/server";
import { buildDashboardData } from "@/application/meal-planning/dashboard-service";
import { requireMealPlanSession } from "@/lib/api/meal-plan-guard";

export async function GET() {
  const session = await requireMealPlanSession();
  if (session instanceof NextResponse) return session;

  const dashboard = await buildDashboardData(
    session.tenantId,
    session.userId,
  );
  return NextResponse.json({ ok: true, dashboard });
}
