/**
 * MP-4: deterministic weekly review metrics from plan + slots + pantry.
 */
import type { MealPlanRow, MealSlotRow } from "@/platform/db/meal-planning";
import {
  getMealPlan,
  getPantrySnapshot,
  listSlotsForPlan,
} from "@/platform/db/meal-planning";
import { getActiveListForPlan } from "@/platform/db/shopping-lists";
import { listPantryItems } from "@/platform/db/pantry";
import { getTasteProfile } from "@/platform/db/personalization";

export type WeeklyReviewInsights = {
  plan_id: number;
  plan_name: string;
  date_range: [string, string];
  slots_total: number;
  slots_cooked: number;
  slots_skipped: number;
  slots_swapped: number;
  cook_rate: number;
  estimated_total_cost: number | null;
  actual_total_cost: number | null;
  cost_variance: number | null;
  pantry_reuse_score_initial: number | null;
  pantry_reuse_score_actual: number;
  most_cooked_cuisine: string | null;
  most_skipped_cuisine: string | null;
  skip_reasons_summary: Record<string, number>;
  expiring_items_used_pct: number;
  expiring_items_wasted: string[];
  new_dishes_tried: string[];
};

function cuisineCounts(
  slots: MealSlotRow[],
  status: MealSlotRow["status"],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of slots) {
    if (s.status !== status || !s.cuisine) continue;
    out[s.cuisine] = (out[s.cuisine] ?? 0) + 1;
  }
  return out;
}

function topKey(counts: Record<string, number>): string | null {
  let best: string | null = null;
  let max = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

function parseSkipReason(notes: string | null): string {
  if (!notes) return "其他";
  if (notes.includes("外食") || notes.includes("外送")) return "外食/外送";
  if (notes.includes("食材")) return "食材不夠";
  if (notes.includes("時間") || notes.includes("沒時間")) return "沒時間";
  if (notes.includes("不想")) return "不想吃";
  return notes.slice(0, 32);
}

export async function buildWeeklyReviewInsights(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<WeeklyReviewInsights | null> {
  const plan = await getMealPlan(planId, tenantId, userId, {
    include_slots: false,
  });
  if (!plan) return null;

  const slots = await listSlotsForPlan(planId, tenantId, userId);
  const active = slots.filter((s) => s.status !== "swapped_out");
  const cooked = active.filter((s) => s.status === "cooked");
  const skipped = active.filter((s) => s.status === "skipped");
  const swapped = slots.filter((s) => s.status === "swapped_out");

  const skipReasons: Record<string, number> = {};
  for (const s of skipped) {
    const r = parseSkipReason(s.notes);
    skipReasons[r] = (skipReasons[r] ?? 0) + 1;
  }

  const pantryFromPantry = cooked.filter((s) =>
    s.key_ingredients.some((k) => k.from_pantry),
  );
  const pantryReuseActual =
    cooked.length > 0 ? pantryFromPantry.length / cooked.length : 0;

  const snapshot = await getPantrySnapshot(planId);
  const expiringAtPlan = parseExpiringNames(snapshot?.expiring_items);
  const wasted = await findWastedDuringPlan(
    tenantId,
    userId,
    plan.start_date,
    plan.end_date,
    expiringAtPlan,
    cooked,
  );
  const usedCount = expiringAtPlan.length - wasted.length;
  const expiringPct =
    expiringAtPlan.length > 0 ? usedCount / expiringAtPlan.length : 1;

  const profile = await getTasteProfile(tenantId, userId);
  const lovedSet = new Set(
    (profile?.loved_dishes ?? []).map((d) => d.name),
  );
  const newDishes = [
    ...new Set(
      cooked
        .map((s) => s.dish_title)
        .filter((t) => t && !lovedSet.has(t)),
    ),
  ];

  const shopping = await getActiveListForPlan(planId, tenantId, userId);
  const actualCost =
    shopping?.actual_total_cost ?? shopping?.estimated_total_cost ?? null;
  const estimated = plan.total_estimated_cost;
  const variance =
    actualCost != null && estimated != null
      ? (actualCost - estimated) / Math.max(estimated, 1)
      : null;

  return {
    plan_id: planId,
    plan_name: plan.name ?? `菜單 ${plan.start_date}`,
    date_range: [plan.start_date, plan.end_date],
    slots_total: active.length,
    slots_cooked: cooked.length,
    slots_skipped: skipped.length,
    slots_swapped: swapped.length,
    cook_rate: active.length > 0 ? cooked.length / active.length : 0,
    estimated_total_cost: estimated,
    actual_total_cost: actualCost,
    cost_variance: variance,
    pantry_reuse_score_initial: plan.pantry_reuse_score,
    pantry_reuse_score_actual: pantryReuseActual,
    most_cooked_cuisine: topKey(cuisineCounts(active, "cooked")),
    most_skipped_cuisine: topKey(cuisineCounts(active, "skipped")),
    skip_reasons_summary: skipReasons,
    expiring_items_used_pct: expiringPct,
    expiring_items_wasted: wasted,
    new_dishes_tried: newDishes.slice(0, 10),
  };
}

function parseExpiringNames(expiring: unknown[] | undefined): string[] {
  if (!expiring?.length) return [];
  return expiring
    .map((e) => {
      if (typeof e === "object" && e != null && "display_name" in e) {
        return String((e as { display_name: string }).display_name);
      }
      if (typeof e === "string") return e;
      return null;
    })
    .filter((x): x is string => Boolean(x));
}

async function findWastedDuringPlan(
  tenantId: string,
  userId: string,
  start: string,
  end: string,
  expiringAtPlan: string[],
  cookedSlots: MealSlotRow[],
): Promise<string[]> {
  if (!expiringAtPlan.length) return [];
  const pantry = await listPantryItems(tenantId, userId);
  const cookedKeys = new Set(
    cookedSlots.flatMap((s) =>
      s.key_ingredients.map((k) => k.item_key),
    ),
  );
  const wasted: string[] = [];
  for (const name of expiringAtPlan) {
    const item = pantry.find(
      (p) =>
        p.display_name === name &&
        p.expires_at &&
        p.expires_at >= start &&
        p.expires_at <= end &&
        (p.quantity == null || p.quantity <= 0),
    );
    if (item && !cookedKeys.has(item.item_key)) {
      wasted.push(name);
    }
  }
  return wasted;
}
