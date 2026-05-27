import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { serializePlanForClient } from "@/application/meal-planning/meal-plan-ui";
import {
  mealPlanConstraintsSchema,
  requireMealPlansApi,
} from "@/application/meal-planning/meal-plans-api";
import { runMealPlanGenerationJob } from "@/application/meal-planning/run-meal-plan-generation";
import { mealPlanDefaultBudgetTwd } from "@/platform/config/meal-planning-config";
import {
  canGenerateMealPlan,
  getMealPlanQuota,
} from "@/platform/db/meal-plan-quota";
import { createMealPlan, listMealPlans } from "@/platform/db/meal-planning";
import { recordMealPlanQuotaBlock } from "@/platform/observability/meal-planning-metrics";

const postBodySchema = z.object({
  constraints: mealPlanConstraintsSchema,
  activate: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Math.min(
    50,
    parseInt(url.searchParams.get("limit") || "20", 10) || 20,
  );

  const plans = await listMealPlans(auth.tenantId, auth.userId, {
    status_filter: status as "draft" | "active" | undefined,
    limit,
  });

  const quota = await getMealPlanQuota(auth.tenantId, auth.userId);

  return NextResponse.json({
    ok: true,
    items: plans.map((p) => serializePlanForClient({ ...p, slots: [] })),
    quota,
  });
}

export async function POST(request: Request) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const quotaCheck = await canGenerateMealPlan(auth.tenantId, auth.userId);
  if (!quotaCheck.allowed) {
    recordMealPlanQuotaBlock("free");
    return NextResponse.json(
      {
        ok: false,
        error: quotaCheck.reason,
        code: "quota_exceeded",
        quota: quotaCheck.quota,
      },
      { status: 429 },
    );
  }

  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, {
      status: 400,
    });
  }

  const constraints = {
    ...body.constraints,
    budget_total_twd:
      body.constraints.budget_total_twd ?? mealPlanDefaultBudgetTwd(),
  };

  const plan = await createMealPlan(auth.tenantId, auth.userId, {
    start_date: constraints.start_date,
    end_date: constraints.end_date,
    meal_pattern: constraints.meal_pattern,
    constraints,
    target_household_member_ids:
      constraints.target_household_member_ids ?? [],
    name: `${constraints.start_date} ~ ${constraints.end_date} 本週菜單`,
    status: "generating",
  });

  if (!plan) {
    return NextResponse.json(
      { ok: false, error: "Failed to create plan" },
      { status: 500 },
    );
  }

  waitUntil(
    runMealPlanGenerationJob(plan.id, auth.tenantId, auth.userId, {
      activate: body.activate,
    }),
  );

  return NextResponse.json(
    {
      ok: true,
      plan_id: plan.id,
      status: "generating",
      generation_progress: { phase: "starting", message: "已開始規劃…" },
    },
    { status: 202 },
  );
}
