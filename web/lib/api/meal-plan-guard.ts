import { NextResponse } from "next/server";
import { isMealPlanExecutionPushEnabled } from "@/platform/config/meal-plan-execution-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { getSessionUserId } from "@/platform/identity/session";
import { getMealPlan } from "@/platform/db/meal-planning";

export async function requireMealPlanSession(): Promise<
  { userId: string; tenantId: string } | NextResponse
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }
  return { userId, tenantId: DEFAULT_TENANT_ID };
}

export async function requirePlanOwnership(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<NextResponse | null> {
  const plan = await getMealPlan(planId, tenantId, userId, {
    include_slots: false,
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return null;
}

export function mealPlanExecutionEnabled(): NextResponse | null {
  if (!isMealPlanExecutionPushEnabled()) {
    return NextResponse.json(
      { error: "Meal plan execution disabled" },
      { status: 503 },
    );
  }
  return null;
}
