/**
 * MP-2: swap slot candidate suggestions + apply.
 */
import OpenAI from "openai";
import type { SwapCandidate } from "@/domain/meal-planning/types";
import { parseApproxQuantity } from "@/domain/meal-planning/aggregate-ingredients";
import { ingredientNameToKey } from "@/domain/meal-planning/validate-plan";
import {
  loadPersonalizationContext,
  renderPersonalizationBlock,
} from "@/application/personalization/personalization-context";
import { computeAggregatedIngredientNeeds } from "@/domain/meal-planning/aggregate-ingredients";
import { computePantryReuseScore } from "@/domain/meal-planning/pantry-reuse-score";
import { resolveModelName } from "@/platform/config/app-config";
import {
  mealPlanSwapCandidatesCount,
  mealPlanSwapLlmTimeoutSec,
} from "@/platform/config/meal-planning-config";
import { listPantryItems } from "@/platform/db/pantry";
import {
  getMealPlan,
  getMealSlot,
  swapMealSlot,
  updateMealPlanMeta,
  type MealSlotRow,
} from "@/platform/db/meal-planning";
import { recordMealPlanSwap } from "@/platform/observability/meal-planning-metrics";

export type SwapMode = "similar" | "different" | "specific";

function parseSwapJson(raw: string): SwapCandidate[] {
  const match = raw.trim().match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const data = JSON.parse(match[0]) as { candidates?: unknown[] };
    const list = Array.isArray(data.candidates) ? data.candidates : [];
    return list.slice(0, mealPlanSwapCandidatesCount()).map((c) => {
      const row = c as Record<string, unknown>;
      const name = String(row.dish_title ?? "");
      const { quantity, unit } = parseApproxQuantity(
        row.approx_quantity as string | number | null,
      );
      const ingredients = Array.isArray(row.key_ingredients)
        ? (row.key_ingredients as Record<string, unknown>[]).map((ing) => {
            const n = String(ing.name ?? ing.display_name ?? "");
            const { quantity: q, unit: u } = parseApproxQuantity(
              ing.approx_quantity as string | number | null,
            );
            return {
              item_key: ingredientNameToKey(n),
              display_name: n,
              approx_quantity: q,
              approx_unit: u,
              from_pantry: Boolean(ing.from_pantry_likely),
              urgency: "none" as const,
            };
          })
        : [];
      return {
        dish_title: name,
        cuisine: row.cuisine == null ? null : String(row.cuisine),
        estimated_time_min:
          row.estimated_time_min == null
            ? null
            : Number(row.estimated_time_min),
        effort_level: row.effort_level as SwapCandidate["effort_level"],
        key_ingredients: ingredients,
        estimated_cost:
          row.estimated_cost == null ? null : Number(row.estimated_cost),
        rationale: row.rationale == null ? null : String(row.rationale),
      };
    });
  } catch {
    return [];
  }
}

export async function suggestSwapCandidates(
  slotId: number,
  tenantId: string,
  userId: string,
  mode: SwapMode,
  userRequest?: string,
): Promise<SwapCandidate[]> {
  const slot = await getMealSlot(slotId, tenantId, userId);
  if (!slot || slot.status !== "planned") return [];

  const plan = await getMealPlan(slot.meal_plan_id, tenantId, userId, {
    include_slots: true,
  });
  if (!plan) return [];

  const personalization = await loadPersonalizationContext(tenantId, userId);
  const modeHint =
    mode === "similar"
      ? "類似風味但不同菜名"
      : mode === "different"
        ? "完全不同菜系與口味"
        : `使用者指定：${userRequest ?? ""}`;

  const prompt = `你是家庭週菜單助手。請為以下餐點提供 ${mealPlanSwapCandidatesCount()} 個替代菜色（JSON only）。

原菜色：${slot.dish_title}（${slot.cuisine ?? ""}，約 ${slot.estimated_time_min ?? 20} 分鐘）
日期：${slot.slot_date} ${slot.meal_type}
替換模式：${modeHint}

約束：
${renderPersonalizationBlock(personalization).slice(0, 500)}

只回 JSON：
{"candidates":[{"dish_title":"...","cuisine":"...","estimated_time_min":15,"key_ingredients":[{"name":"...","approx_quantity":"..."}],"estimated_cost":50,"rationale":"..."}]}`;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return [];

  const client = new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 0,
    timeout: mealPlanSwapLlmTimeoutSec() * 1000,
  });

  try {
    const res = await client.chat.completions.create({
      model: resolveModelName(),
      max_tokens: 600,
      temperature: 0.6,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.choices[0]?.message?.content ?? "";
    return parseSwapJson(raw);
  } catch {
    recordMealPlanSwap(mode, "error");
    return [];
  }
}

export async function applySwap(
  slotId: number,
  tenantId: string,
  userId: string,
  candidate: SwapCandidate,
  mode: SwapMode = "similar",
): Promise<MealSlotRow | null> {
  const slot = await getMealSlot(slotId, tenantId, userId);
  if (!slot || slot.status !== "planned") return null;

  const updated = await swapMealSlot(slotId, tenantId, userId, {
    dish_title: candidate.dish_title,
    cuisine: candidate.cuisine ?? null,
    estimated_time_min: candidate.estimated_time_min ?? null,
    effort_level: candidate.effort_level ?? null,
    key_ingredients: candidate.key_ingredients,
    estimated_cost: candidate.estimated_cost ?? null,
    tags: [],
    rationale: candidate.rationale ?? null,
  });

  if (!updated) return null;

  const plan = await getMealPlan(slot.meal_plan_id, tenantId, userId, {
    include_slots: true,
  });
  if (plan?.slots) {
    const pantry = await listPantryItems(tenantId, userId, {
      include_expired: false,
      min_confidence: 0.5,
    });
    const planned = plan.slots.filter((s) => s.status === "planned");
    const reuse = computePantryReuseScore(
      planned.map((s) => ({
        slot_date: s.slot_date,
        meal_type: s.meal_type as "lunch",
        slot_index: s.slot_index,
        dish_title: s.dish_title,
        key_ingredients: s.key_ingredients,
      })),
      pantry,
    );
    const total = planned.reduce((sum, s) => sum + (s.estimated_cost ?? 0), 0);
    void computeAggregatedIngredientNeeds(
      planned.map((s) => ({
        slot_date: s.slot_date,
        meal_type: s.meal_type as "lunch",
        slot_index: s.slot_index,
        dish_title: s.dish_title,
        key_ingredients: s.key_ingredients,
      })),
      pantry,
    );
    await updateMealPlanMeta(slot.meal_plan_id, tenantId, userId, {
      total_estimated_cost: total,
      pantry_reuse_score: reuse,
    });
  }

  recordMealPlanSwap(mode, "ok");
  return updated;
}
