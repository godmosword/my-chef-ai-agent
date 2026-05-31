/**
 * MP-3 orchestration: regenerate shopping lists from meal plans.
 */
import {
  mergeIngredientsFromPlan,
  needsFromMealSlots,
} from "@/domain/shopping-list/merge-ingredients";
import { isShoppingListEnabled } from "@/platform/config/shopping-list-config";
import { listPantryItems } from "@/platform/db/pantry";
import { getMealPlan, updateMealPlanMeta } from "@/platform/db/meal-planning";
import {
  activateShoppingList,
  bulkReplaceAutoItems,
  createShoppingList,
  getActiveListForPlan,
  getShoppingList,
  updateShoppingListMeta,
  type ShoppingListRow,
} from "@/platform/db/shopping-lists";
import {
  recordShoppingListGeneration,
} from "@/platform/observability/shopping-list-metrics";

export async function regenerateFromPlan(
  planId: number,
  tenantId: string,
  userId: string,
  opts?: {
    preserve_manual_items?: boolean;
    preserve_check_state?: boolean;
  },
): Promise<ShoppingListRow | null> {
  if (!isShoppingListEnabled()) return null;

  const start = Date.now();
  const plan = await getMealPlan(planId, tenantId, userId, {
    include_slots: true,
  });
  if (!plan?.slots?.length) {
    recordShoppingListGeneration("manual", "error", Date.now() - start, 0, 0);
    return null;
  }

  const pantryItems = await listPantryItems(tenantId, userId, {
    include_expired: false,
    min_confidence: 0.5,
  });

  const needs = needsFromMealSlots(plan.slots);
  const merged = mergeIngredientsFromPlan(needs, pantryItems);
  const estimatedTotal = merged.reduce(
    (s, m) => s + (m.estimated_total_price ?? 0),
    0,
  );

  let list =
    (await getActiveListForPlan(planId, tenantId, userId)) ??
    (await getShoppingListByPlanDraft(planId, tenantId, userId));

  if (!list) {
    const name = plan.name ?? `${plan.start_date} ~ ${plan.end_date} 採買清單`;
    list = await createShoppingList(tenantId, userId, {
      meal_plan_id: planId,
      name,
      status: "active",
    });
    if (list) {
      await activateShoppingList(list.id, tenantId, userId);
    }
  }

  if (!list) {
    recordShoppingListGeneration("plan_create", "error", Date.now() - start, needs.length, 0);
    return null;
  }

  await bulkReplaceAutoItems(list.id, tenantId, userId, merged, {
    preserve_check_state: opts?.preserve_check_state !== false,
  });

  const regenCount = list.regenerated_count + 1;
  await updateShoppingListMeta(list.id, tenantId, userId, {
    name: list.name ?? `${plan.start_date} ~ ${plan.end_date} 採買清單`,
    estimated_total_cost: estimatedTotal,
    regenerated_count: regenCount,
    last_regenerated_at: new Date().toISOString(),
    pantry_snapshot_at_generation: pantryItems.map((p) => ({
      item_key: p.item_key,
      display_name: p.display_name,
      quantity: p.quantity,
      unit: p.unit,
      expires_at: p.expires_at,
    })),
  });

  if (Math.abs((plan.total_estimated_cost ?? 0) - estimatedTotal) > 50) {
    await updateMealPlanMeta(planId, tenantId, userId, {
      total_estimated_cost: estimatedTotal,
    });
  }

  const updated = await getShoppingList(list.id, tenantId, userId);
  recordShoppingListGeneration(
    list.regenerated_count === 0 ? "plan_create" : "user_regen",
    "ok",
    Date.now() - start,
    needs.length,
    merged.length,
  );
  return updated;
}

async function getShoppingListByPlanDraft(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<ShoppingListRow | null> {
  const sqlLists = await import("@/platform/db/shopping-lists");
  const all = await sqlLists.listShoppingLists(tenantId, userId, { limit: 5 });
  return (
    all.find((l) => l.meal_plan_id === planId && l.status !== "abandoned") ??
    null
  );
}

/** Initial list after meal plan generation. */
export async function ensureShoppingListForPlan(
  planId: number,
  tenantId: string,
  userId: string,
): Promise<ShoppingListRow | null> {
  return regenerateFromPlan(planId, tenantId, userId, {
    preserve_manual_items: true,
    preserve_check_state: false,
  });
}
