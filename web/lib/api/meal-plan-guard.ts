import { NextResponse } from "next/server";
import { isMealPlanningEnabled } from "@/platform/config/meal-planning-config";
import { isMealPlanExecutionPushEnabled } from "@/platform/config/meal-plan-execution-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { getSessionUserId } from "@/platform/identity/session";
import {
  getMealPlan,
  getMealSlotForPlan,
  type MealSlotRow,
} from "@/platform/db/meal-planning";

export type MealPlanSlotRouteContext = {
  params: Promise<{ planId: string; slotId: string }>;
};

type MealPlanSession = { userId: string; tenantId: string };

export async function requireMealPlanSession(): Promise<
  MealPlanSession | NextResponse
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

export async function requireMealPlanningSession(): Promise<
  MealPlanSession | NextResponse
> {
  if (!isMealPlanningEnabled()) {
    return NextResponse.json(
      { error: "Meal planning disabled" },
      { status: 503 },
    );
  }
  return requireMealPlanSession();
}

export async function requireMealPlanSlotRoute(
  context: MealPlanSlotRouteContext,
): Promise<
  | {
      session: MealPlanSession;
      planId: number;
      slotId: number;
    }
  | NextResponse
> {
  const disabled = mealPlanExecutionEnabled();
  if (disabled) return disabled;

  const session = await requireMealPlanSession();
  if (session instanceof NextResponse) return session;

  const { planId: planIdStr, slotId: slotIdStr } = await context.params;
  return {
    session,
    planId: parseInt(planIdStr, 10),
    slotId: parseInt(slotIdStr, 10),
  };
}

export async function requireMealPlanSlotInPlanRoute(
  context: MealPlanSlotRouteContext,
  options: { rejectInvalidIds?: boolean } = {},
): Promise<
  | {
      session: MealPlanSession;
      planId: number;
      slotId: number;
    }
  | NextResponse
> {
  const route = await requireMealPlanSlotRoute(context);
  if (route instanceof NextResponse) return route;

  const { session, planId, slotId } = route;
  if (options.rejectInvalidIds) {
    const invalid = rejectInvalidMealPlanSlotIds(planId, slotId);
    if (invalid) return invalid;
  }

  const slotCheck = await requireSlotInPlan(
    planId,
    slotId,
    session.tenantId,
    session.userId,
  );
  if (slotCheck instanceof NextResponse) return slotCheck;
  return route;
}

function rejectInvalidMealPlanSlotIds(
  planId: number,
  slotId: number,
): NextResponse | null {
  if (!Number.isFinite(planId) || !Number.isFinite(slotId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  return null;
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

/** Ensures plan exists and slot belongs to that plan. */
export async function requireSlotInPlan(
  planId: number,
  slotId: number,
  tenantId: string,
  userId: string,
): Promise<MealSlotRow | NextResponse> {
  const denied = await requirePlanOwnership(planId, tenantId, userId);
  if (denied) return denied;
  const slot = await getMealSlotForPlan(slotId, planId, tenantId, userId);
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }
  return slot;
}

function mealPlanExecutionEnabled(): NextResponse | null {
  if (!isMealPlanExecutionPushEnabled()) {
    return NextResponse.json(
      { error: "Meal plan execution disabled" },
      { status: 503 },
    );
  }
  return null;
}
