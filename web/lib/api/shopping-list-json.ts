import type {
  ShoppingListItemRow,
  ShoppingListRow,
} from "@/platform/db/shopping-lists";
import { SECTION_LABELS } from "@/domain/shopping-list/sections";

export function shoppingListToJson(list: ShoppingListRow) {
  const items = list.items ?? [];
  const active = items.filter((i) => !i.is_removed);
  const checked = active.filter((i) => i.is_checked).length;
  return {
    id: list.id,
    meal_plan_id: list.meal_plan_id,
    name: list.name,
    status: list.status,
    estimated_total_cost: list.estimated_total_cost,
    actual_total_cost: list.actual_total_cost,
    share_token: list.share_token,
    share_token_expires_at: list.share_token_expires_at,
    regenerated_count: list.regenerated_count,
    last_regenerated_at: list.last_regenerated_at,
    created_at: list.created_at,
    updated_at: list.updated_at,
    completed_at: list.completed_at,
    progress: {
      total: active.length,
      checked,
    },
    items: active.map(itemToJson),
    sections: groupBySection(active),
  };
}

export function itemToJson(item: ShoppingListItemRow) {
  return {
    id: item.id,
    item_key: item.item_key,
    display_name: item.display_name,
    category: item.category,
    section: item.section,
    section_label: SECTION_LABELS[item.section as keyof typeof SECTION_LABELS] ?? item.section,
    quantity: item.quantity,
    unit: item.unit,
    quantity_display: item.quantity_display,
    estimated_unit_price: item.estimated_unit_price,
    estimated_total_price: item.estimated_total_price,
    source: item.source,
    source_slot_ids: item.source_slot_ids,
    from_pantry_partial: item.from_pantry_partial,
    pantry_coverage_note: item.pantry_coverage_note,
    is_checked: item.is_checked,
    checked_at: item.checked_at,
    notes: item.notes,
    display_order: item.display_order,
  };
}

function groupBySection(items: ShoppingListItemRow[]) {
  const map = new Map<string, ReturnType<typeof itemToJson>[]>();
  for (const item of items) {
    if (!map.has(item.section)) map.set(item.section, []);
    map.get(item.section)!.push(itemToJson(item));
  }
  return Object.fromEntries(map);
}
