import OpenAI from "openai";
import {
  loadPersonalizationContext,
  renderPersonalizationBlock,
} from "@/application/personalization/personalization-context";
import { enumerateExpectedSlots } from "@/domain/meal-planning/slot-expectations";
import type {
  CandidateSlot,
  MealPlanConstraints,
  MealType,
} from "@/domain/meal-planning/types";
import { parseApproxQuantity } from "@/domain/meal-planning/aggregate-ingredients";
import { ingredientNameToKey } from "@/domain/meal-planning/validate-plan";
import type { PantryItem } from "@/platform/db/pantry";
import { resolveModelName } from "@/platform/config/app-config";
import {
  mealPlanDefaultBudgetTwd,
  mealPlanLlmMaxTokens,
  mealPlanLlmTimeoutSec,
  mealPlanWeekdayMaxTime,
  mealPlanWeekendMaxTime,
} from "@/platform/config/meal-planning-config";
import type { KeyIngredient } from "@/domain/meal-planning/types";

export type CandidatePlanResponse = {
  slots: CandidateSlot[];
  total_estimated_cost?: number;
  ingredient_reuse_notes?: string;
};

function parsePlanJson(raw: string): CandidatePlanResponse | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as CandidatePlanResponse;
  } catch {
    return null;
  }
}

function normalizeCandidateSlots(
  parsed: CandidatePlanResponse,
  pantryKeys: Set<string>,
): CandidateSlot[] {
  return (parsed.slots ?? []).map((s) => {
    const keyIngredients: KeyIngredient[] = (s.key_ingredients ?? []).map(
      (ing: Record<string, unknown>) => {
        const name = String(ing.name ?? ing.display_name ?? "");
        const { quantity, unit } = parseApproxQuantity(
          ing.approx_quantity as string | number | null,
        );
        const itemKey = ingredientNameToKey(name);
        const fromPantry =
          Boolean(ing.from_pantry_likely) || pantryKeys.has(itemKey);
        return {
          item_key: itemKey,
          display_name: name,
          approx_quantity: quantity,
          approx_unit: unit,
          from_pantry: fromPantry,
          urgency: (ing.urgency as KeyIngredient["urgency"]) ?? "none",
        };
      },
    );
    return {
      slot_date: String(s.slot_date),
      meal_type: s.meal_type as MealType,
      slot_index: Number(s.slot_index ?? 0),
      dish_title: String(s.dish_title),
      cuisine: s.cuisine ?? null,
      estimated_time_min:
        s.estimated_time_min == null ? null : Number(s.estimated_time_min),
      effort_level: s.effort_level ?? null,
      key_ingredients: keyIngredients,
      estimated_cost:
        s.estimated_cost == null ? null : Number(s.estimated_cost),
      tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
      rationale: s.rationale ?? null,
    };
  });
}

export async function generateCandidatePlan(
  tenantId: string,
  userId: string,
  constraints: MealPlanConstraints,
  pantryItems: PantryItem[],
  expiringItems: PantryItem[],
  recentlyEaten: string[],
  repairViolations?: string[],
  existingPlan?: CandidateSlot[],
): Promise<CandidatePlanResponse> {
  const personalization = await loadPersonalizationContext(tenantId, userId);

  const expected = enumerateExpectedSlots(
    constraints.start_date,
    constraints.end_date,
    constraints.meal_pattern,
  );
  const totalSlots = expected.length;
  const nDays =
    Math.round(
      (new Date(`${constraints.end_date}T12:00:00Z`).getTime() -
        new Date(`${constraints.start_date}T12:00:00Z`).getTime()) /
        86400000,
    ) + 1;

  const budget =
    constraints.budget_total_twd ?? mealPlanDefaultBudgetTwd();
  const weekdayMax =
    constraints.weekday_max_time_min ?? mealPlanWeekdayMaxTime();
  const weekendMax =
    constraints.weekend_max_time_min ?? mealPlanWeekendMaxTime();

  const expiringLines = expiringItems
    .slice(0, 20)
    .map((i) => `- ${i.display_name}`);
  const otherLines = pantryItems
    .filter((p) => !expiringItems.some((e) => e.id === p.id))
    .slice(0, 30)
    .map((i) => `- ${i.display_name}`);

  const repairBlock = repairViolations?.length
    ? `\n【必須修正的違規】\n${repairViolations.join("\n")}\n請只修改受影響菜色，其餘保持不變，回傳完整 plan JSON。\n現有計畫參考：${JSON.stringify(existingPlan ?? [])}`
    : "";

  const prompt = `你是「家庭週菜單規劃師」。為使用者規劃一週的菜單，必須兼顧多項約束。

【規劃範圍】
日期：${constraints.start_date} 到 ${constraints.end_date}（共 ${nDays} 天）
每天用餐：${JSON.stringify(constraints.meal_pattern)}
總共需要規劃 ${totalSlots} 個菜色

【硬性約束（必須遵守）】
${renderPersonalizationBlock(personalization).split("\n").slice(0, 15).join("\n")}
預算上限：NT$ ${budget}

【軟性約束（盡量符合）】
- 平日每餐不超過 ${weekdayMax} 分鐘
- 假日最多 ${weekendMax} 分鐘
- 同一菜系連續不超過 ${constraints.max_same_cuisine_in_row ?? 2} 餐
- 同一蛋白質連續不超過 ${constraints.max_same_protein_in_row ?? 2} 餐

【冰箱快過期】
${expiringLines.join("\n") || "（無）"}

【其他常備】
${otherLines.join("\n") || "（無）"}

【近期已吃過（避免重複）】
${recentlyEaten.slice(0, 15).join("、") || "（無）"}

${repairBlock}

只回 JSON，格式含 slots 陣列（${totalSlots} 項）、total_estimated_cost、每道含 dish_title、cuisine、estimated_time_min、key_ingredients 等。`;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 0,
    timeout: mealPlanLlmTimeoutSec() * 1000,
  });

  const call = async (extra?: string) => {
    const res = await client.chat.completions.create({
      model: resolveModelName(),
      max_tokens: mealPlanLlmMaxTokens(),
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: extra ? `${prompt}\n\n${extra}` : prompt,
        },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  };

  let raw = await call();
  let parsed = parsePlanJson(raw);
  if (!parsed) {
    raw = await call("上次回傳不是有效 JSON，請只回一個 JSON 物件。");
    parsed = parsePlanJson(raw);
  }
  if (!parsed) throw new Error("Failed to parse meal plan JSON");

  const pantryKeys = new Set(pantryItems.map((p) => p.item_key));
  return {
    slots: normalizeCandidateSlots(parsed, pantryKeys),
    total_estimated_cost: parsed.total_estimated_cost,
    ingredient_reuse_notes: parsed.ingredient_reuse_notes,
  };
}
