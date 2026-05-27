/**
 * After shopping list completion, sync checked items back to pantry (MP-3).
 */
import { estimateExpiresAt } from "@/application/pantry/vision/map-to-pantry-inputs";
import type { PantryCategory } from "@/domain/pantry/pantry-types";
import { shoppingAutoSyncToPantry } from "@/platform/config/shopping-list-config";
import { bulkAddPantryItems } from "@/platform/db/pantry";
import {
  getShoppingList,
  type ShoppingListItemRow,
} from "@/platform/db/shopping-lists";

export type PantrySyncResult = {
  added: number;
  merged: number;
  skipped: number;
};

export async function syncCompletedListToPantry(
  listId: number,
  tenantId: string,
  userId: string,
  opts?: { include_unchecked?: boolean },
): Promise<PantrySyncResult> {
  if (!shoppingAutoSyncToPantry()) {
    return { added: 0, merged: 0, skipped: 0 };
  }

  const list = await getShoppingList(listId, tenantId, userId, {
    include_removed: false,
  });
  if (!list?.items?.length) {
    return { added: 0, merged: 0, skipped: 0 };
  }

  const targets = list.items.filter((i) =>
    opts?.include_unchecked ? !i.is_removed : i.is_checked && !i.is_removed,
  );

  const inputs = targets.map((item) => itemToPantryInput(item));
  if (!inputs.length) {
    return { added: 0, merged: 0, skipped: targets.length };
  }

  const rows = await bulkAddPantryItems(tenantId, userId, inputs, {
    merge_strategy: "merge_if_same_expiry",
  });

  return {
    added: rows.length,
    merged: Math.max(0, targets.length - rows.length),
    skipped: list.items.length - targets.length,
  };
}

function itemToPantryInput(item: ShoppingListItemRow) {
  const category = (item.category ?? "other") as PantryCategory;
  const purchasedAt = new Date().toISOString().slice(0, 10);
  const qty =
    item.quantity != null
      ? String(item.quantity)
      : item.quantity_display;
  return {
    raw_name: item.display_name,
    raw_quantity: qty,
    raw_unit: item.unit,
    expires_at: estimateExpiresAt(category, purchasedAt),
    purchased_at: purchasedAt,
    source: "shopping_list_completed" as const,
    confidence: 1,
    notes: item.notes,
  };
}
