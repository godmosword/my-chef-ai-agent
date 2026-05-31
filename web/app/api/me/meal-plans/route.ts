import { NextResponse } from "next/server";
import { generateMealPlan } from "@/application/meal-planning/meal-planner";
import { CreateMealPlanSchema } from "@/domain/meal-planning/meal-plan-api-schemas";
import { readJsonBody } from "@/lib/api/route-helpers";
import { mealPlanToJson } from "@/lib/api/meal-plan-json";
import { requireMealPlanningSession } from "@/lib/api/meal-plan-guard";
import {
  mealPlanDefaultBudgetTwd,
  mealPlanWeekdayMaxTime,
  mealPlanWeekendMaxTime,
} from "@/platform/config/meal-planning-config";
import { getMealPlan, listMealPlans } from "@/platform/db/meal-planning";

export async function GET(request: Request) {
  const session = await requireMealPlanningSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const plans = await listMealPlans(session.tenantId, session.userId, {
    status_filter: status as
      | "draft"
      | "active"
      | "completed"
      | "abandoned"
      | "archived"
      | undefined,
    limit: 20,
  });
  return NextResponse.json({
    ok: true,
    plans: plans.map((p) => mealPlanToJson({ ...p, slots: [] })),
  });
}

export async function POST(request: Request) {
  const session = await requireMealPlanningSession();
  if (session instanceof NextResponse) return session;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = CreateMealPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = parsed.data;
  const mealPattern = data.meal_pattern ?? {
    breakfast: false,
    lunch: false,
    dinner: true,
  };

  try {
    const result = await generateMealPlan({
      tenant_id: session.tenantId,
      user_id: session.userId,
      activate: data.activate ?? false,
      constraints: {
        start_date: data.start_date,
        end_date: data.end_date,
        meal_pattern: mealPattern,
        budget_total_twd:
          data.budget_total_twd ?? mealPlanDefaultBudgetTwd(),
        weekday_max_time_min:
          data.weekday_max_time_min ?? mealPlanWeekdayMaxTime(),
        weekend_max_time_min:
          data.weekend_max_time_min ?? mealPlanWeekendMaxTime(),
        prioritize_pantry: data.prioritize_pantry ?? true,
        prioritize_expiring: data.prioritize_expiring ?? true,
      },
    });

    const plan = await getMealPlan(
      result.plan_id,
      session.tenantId,
      session.userId,
      { include_slots: true },
    );
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      plan: mealPlanToJson(plan),
      warnings: result.warnings,
      pantry_reuse_score: result.pantry_reuse_score,
      validation_iterations: result.validation_iterations,
    });
  } catch (err) {
    console.error("[meal-plans] generate failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Meal plan generation failed",
      },
      { status: 500 },
    );
  }
}
