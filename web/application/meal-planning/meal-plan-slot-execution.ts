/**
 * MP-4: mark slot cooked/skipped + pantry consume preview.
 */
import type { KeyIngredient } from "@/domain/meal-planning/types";
import type { MealSlotRow } from "@/platform/db/meal-planning";
import {
  getMealSlot,
  markSlotCooked,
  markSlotSkipped,
} from "@/platform/db/meal-planning";
import { listPantryItems, consumePantryItem } from "@/platform/db/pantry";
import {
  resetMealPlanMorningIgnored,
  resetIgnored,
} from "@/platform/db/notification-prefs";
import { recordUserEngagement } from "@/application/notifications/engagement-signals";

export type ConsumeLine = {
  pantry_item_id: number | null;
  item_key: string;
  display_name: string;
  approx_quantity: number | null;
  approx_unit: string | null;
  auto_tick: boolean;
  reason?: string;
};

const VAGUE_UNITS = new Set(["適量", "少許", "些許", "適當"]);

export function ingredientsFromSlot(slot: MealSlotRow): KeyIngredient[] {
  const recipe = slot.full_recipe_json;
  if (recipe && Array.isArray(recipe.ingredients)) {
    return (recipe.ingredients as KeyIngredient[]).map((i) => ({
      item_key: String(i.item_key ?? i.display_name),
      display_name: String(i.display_name ?? i.item_key),
      approx_quantity:
        i.approx_quantity != null ? Number(i.approx_quantity) : null,
      approx_unit: i.approx_unit != null ? String(i.approx_unit) : null,
      from_pantry: Boolean(i.from_pantry),
      urgency: i.urgency ?? "normal",
    }));
  }
  return slot.key_ingredients ?? [];
}

export function buildConsumePreview(
  ingredients: KeyIngredient[],
  pantryItems: Awaited<ReturnType<typeof listPantryItems>>,
): ConsumeLine[] {
  return ingredients.map((ing) => {
    const vague =
      ing.approx_unit != null && VAGUE_UNITS.has(ing.approx_unit);
    const match = pantryItems.find(
      (p) =>
        p.item_key === ing.item_key ||
        p.display_name === ing.display_name,
    );
    return {
      pantry_item_id: match?.id ?? null,
      item_key: ing.item_key,
      display_name: ing.display_name,
      approx_quantity: ing.approx_quantity,
      approx_unit: ing.approx_unit,
      auto_tick:
        !vague &&
        match != null &&
        ing.approx_quantity != null &&
        ing.approx_unit != null,
      reason: vague ? "適量不自動扣" : match ? undefined : "冰箱無此項",
    };
  });
}

export async function markSlotCookedWithEngagement(
  slotId: number,
  tenantId: string,
  userId: string,
): Promise<{ slot: MealSlotRow | null; consume_preview: ConsumeLine[] }> {
  const existing = await getMealSlot(slotId, tenantId, userId);
  if (!existing) return { slot: null, consume_preview: [] };

  const slot = await markSlotCooked(slotId, tenantId, userId);
  await recordUserEngagement(tenantId, userId, "opened");
  await resetMealPlanMorningIgnored(tenantId, userId);
  await resetIgnored(tenantId, userId);

  const pantry = await listPantryItems(tenantId, userId);
  const preview = buildConsumePreview(
    ingredientsFromSlot(existing),
    pantry,
  );
  return { slot, consume_preview: preview };
}

export async function applyPantryConsumeFromSlot(
  tenantId: string,
  userId: string,
  lines: ConsumeLine[],
  opts?: { consume_all?: boolean },
): Promise<{ consumed: number; errors: string[] }> {
  let consumed = 0;
  const errors: string[] = [];
  for (const line of lines) {
    if (!line.pantry_item_id) continue;
    if (!opts?.consume_all && !line.auto_tick) continue;
    try {
      if (
        opts?.consume_all ||
        (line.approx_quantity != null && line.approx_unit)
      ) {
        await consumePantryItem(line.pantry_item_id, tenantId, userId, {
          amount: line.approx_quantity ?? undefined,
          unit: line.approx_unit ?? undefined,
        });
      } else {
        await consumePantryItem(line.pantry_item_id, tenantId, userId, {});
      }
      consumed += 1;
    } catch (e) {
      errors.push(
        `${line.display_name}: ${e instanceof Error ? e.message : "failed"}`,
      );
    }
  }
  return { consumed, errors };
}

export async function markSlotSkippedWithReason(
  slotId: number,
  tenantId: string,
  userId: string,
  reason: string,
): Promise<MealSlotRow | null> {
  return markSlotSkipped(slotId, tenantId, userId, reason);
}
