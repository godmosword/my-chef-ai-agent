import type { MealPlanConstraints } from "@/domain/meal-planning/types";

export type MealPlanClient = {
  id: number;
  start_date: string;
  end_date: string;
  meal_pattern: MealPlanConstraints["meal_pattern"];
  constraints: MealPlanConstraints;
  status: string;
  name: string | null;
  total_estimated_cost: number | null;
  pantry_reuse_score: number | null;
  generation_progress: {
    phase: string;
    message?: string;
    iteration?: number;
    errors?: string[];
  };
  slots: MealSlotClient[];
};

export type MealSlotClient = {
  id: number;
  meal_plan_id: number;
  slot_date: string;
  meal_type: string;
  slot_index: number;
  dish_title: string;
  cuisine: string | null;
  estimated_time_min: number | null;
  key_ingredients: Array<{
    display_name: string;
    from_pantry: boolean;
    urgency: string;
  }>;
  estimated_cost: number | null;
  rationale: string | null;
  status: string;
  notes: string | null;
  has_full_recipe: boolean;
};

export type PlanSummary = {
  date_range_zh: string;
  total_cost: number | null;
  budget: number | null;
  pantry_reuse_pct: number | null;
  slot_count: number;
  avg_time_min: number | null;
  purchase_count: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`,
    );
  }
  return data as T;
}

export async function fetchActiveMealPlan(): Promise<{
  plan: MealPlanClient | null;
  summary?: PlanSummary;
}> {
  const res = await fetch("/api/me/meal-plans/active");
  const data = await parseJson<{
    ok: true;
    plan: MealPlanClient | null;
    summary?: PlanSummary;
  }>(res);
  return { plan: data.plan, summary: data.summary };
}

export async function fetchLatestMealPlan(): Promise<MealPlanClient | null> {
  const { plan: active } = await fetchActiveMealPlan();
  if (active) return active;
  const res = await fetch("/api/me/meal-plans?limit=10");
  const data = await parseJson<{ ok: true; items: MealPlanClient[] }>(res);
  const pick = data.items.find(
    (p) =>
      p.status === "generating" ||
      p.status === "draft" ||
      p.status === "active",
  );
  if (!pick) return null;
  const full = await fetchMealPlan(pick.id);
  return full.plan;
}

export async function createMealPlanGeneration(constraints: MealPlanConstraints): Promise<{
  plan_id: number;
  status: string;
}> {
  const res = await fetch("/api/me/meal-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ constraints }),
  });
  const data = await parseJson<{
    ok: true;
    plan_id: number;
    status: string;
  }>(res);
  return { plan_id: data.plan_id, status: data.status };
}

export async function fetchMealPlanStatus(planId: number): Promise<{
  status: string;
  phase: string;
  progress_hint: string;
  done: boolean;
  errors: string[];
}> {
  const res = await fetch(`/api/me/meal-plans/${planId}/status`);
  return parseJson(res);
}

export async function fetchMealPlan(planId: number): Promise<{
  plan: MealPlanClient;
  summary: PlanSummary;
}> {
  const res = await fetch(`/api/me/meal-plans/${planId}`);
  const data = await parseJson<{
    ok: true;
    plan: MealPlanClient;
    summary: PlanSummary;
  }>(res);
  return { plan: data.plan, summary: data.summary };
}

export async function activateMealPlanApi(planId: number): Promise<MealPlanClient> {
  const res = await fetch(`/api/me/meal-plans/${planId}/activate`, {
    method: "POST",
  });
  const data = await parseJson<{ ok: true; plan: MealPlanClient }>(res);
  return data.plan;
}

export async function abandonMealPlanApi(planId: number): Promise<void> {
  await parseJson(
    await fetch(`/api/me/meal-plans/${planId}/abandon`, { method: "POST" }),
  );
}

export async function swapMealSlotApi(
  planId: number,
  slotId: number,
  body: {
    mode: "similar" | "different" | "specific";
    user_request?: string;
    candidate_index?: number;
    candidate?: MealSlotClient;
  },
): Promise<{ candidates?: unknown[]; slot?: MealSlotClient; applied: boolean }> {
  const res = await fetch(
    `/api/me/meal-plans/${planId}/slots/${slotId}/swap`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseJson(res);
}

export async function expandMealSlotApi(
  planId: number,
  slotId: number,
): Promise<{ recipe: Record<string, unknown> }> {
  const res = await fetch(
    `/api/me/meal-plans/${planId}/slots/${slotId}/expand`,
    { method: "POST" },
  );
  const data = await parseJson<{ ok: true; recipe: Record<string, unknown> }>(
    res,
  );
  return { recipe: data.recipe };
}
