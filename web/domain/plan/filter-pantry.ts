import type { AggregatedShoppingItem } from "@chef/shared-types";
import { isPantryMatch, pantryNameKeys } from "@/domain/pantry/tonight";

export function shoppingItemAtHome(
  item: AggregatedShoppingItem,
  pantryItems: string[],
): boolean {
  if (!pantryItems.length) return false;
  return isPantryMatch(item.name, pantryNameKeys(pantryItems));
}

export function filterShoppingGroupsByPantry<T extends AggregatedShoppingItem>(
  groups: Partial<Record<string, T[]>>,
  pantryItems: string[],
): Partial<Record<string, T[]>> {
  if (!pantryItems.length) return groups;
  const out: Partial<Record<string, T[]>> = {};
  for (const [cat, list] of Object.entries(groups)) {
    if (!list?.length) continue;
    const kept = list.filter((item) => !shoppingItemAtHome(item, pantryItems));
    if (kept.length) out[cat] = kept;
  }
  return out;
}
