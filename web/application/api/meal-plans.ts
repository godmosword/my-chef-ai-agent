import { apiFetch } from "./client";
import type { KeyIngredient } from "@/domain/meal-planning/types";

export type MealPlanSlotJson = {
  id: number;
  slot_date: string;
  meal_type: string;
  slot_index: number;
  dish_title: string;
  cuisine: string | null;
  estimated_time_min: number | null;
  effort_level: string | null;
  key_ingredients: KeyIngredient[];
  estimated_cost: number | null;
  tags: string[];
  rationale: string | null;
  status: string;
};

export type MealPlanJson = {
  id: number;
  start_date: string;
  end_date: string;
  status: string;
  name: string | null;
  total_estimated_cost: number | null;
  pantry_reuse_score: number | null;
  slots: MealPlanSlotJson[];
};

export type GenerateMealPlanInput = {
  start_date: string;
  end_date: string;
  meal_pattern?: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  budget_total_twd?: number;
  activate?: boolean;
};

export async function listMealPlans(status?: string): Promise<MealPlanJson[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiFetch<{ ok: true; plans: MealPlanJson[] }>(
    `/api/me/meal-plans${q}`,
  );
  return res.plans;
}

export async function fetchMealPlan(planId: number): Promise<MealPlanJson> {
  const res = await apiFetch<{ ok: true; plan: MealPlanJson }>(
    `/api/me/meal-plans/${planId}`,
  );
  return res.plan;
}

export async function generateMealPlanApi(
  input: GenerateMealPlanInput,
): Promise<{
  plan: MealPlanJson;
  warnings: string[];
  pantry_reuse_score: number;
}> {
  const res = await apiFetch<{
    ok: true;
    plan: MealPlanJson;
    warnings: string[];
    pantry_reuse_score: number;
  }>("/api/me/meal-plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    plan: res.plan,
    warnings: res.warnings,
    pantry_reuse_score: res.pantry_reuse_score,
  };
}

export async function activateMealPlanApi(
  planId: number,
): Promise<MealPlanJson> {
  const res = await apiFetch<{ ok: true; plan: MealPlanJson }>(
    `/api/me/meal-plans/${planId}/activate`,
    { method: "POST" },
  );
  return res.plan;
}

export function storeMealPlanWarnings(planId: number, warnings: string[]): void {
  if (typeof window === "undefined" || !warnings.length) return;
  sessionStorage.setItem(
    `meal-plan-warnings-${planId}`,
    JSON.stringify(warnings),
  );
}

export function readMealPlanWarnings(planId: number): string[] {
  if (typeof window === "undefined") return [];
  const raw = sessionStorage.getItem(`meal-plan-warnings-${planId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function clearMealPlanWarnings(planId: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`meal-plan-warnings-${planId}`);
}
