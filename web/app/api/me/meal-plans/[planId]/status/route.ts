import { NextResponse } from "next/server";
import {
  planForbidden,
  requireMealPlansApi,
} from "@/application/meal-planning/meal-plans-api";
import { getMealPlan } from "@/platform/db/meal-planning";

type Params = { params: Promise<{ planId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const { planId } = await params;
  const id = parseInt(planId, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const plan = await getMealPlan(id, auth.tenantId, auth.userId, {
    include_slots: false,
  });
  if (!plan) return planForbidden();

  const progress = plan.generation_progress;
  const done = plan.status !== "generating";

  return NextResponse.json({
    ok: true,
    status: plan.status,
    progress_hint: progress.message ?? progress.phase,
    phase: progress.phase,
    iteration: progress.iteration ?? 0,
    errors: progress.errors ?? [],
    done,
  });
}
