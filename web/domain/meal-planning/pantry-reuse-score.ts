import type { PantryItem } from "@/domain/pantry/pantry-types";
import type { CandidateSlot } from "./types";

export function computePantryReuseScore(
  slots: CandidateSlot[],
  pantryItems: PantryItem[],
): number {
  const pantryKeys = new Set(pantryItems.map((p) => p.item_key));
  let total = 0;
  let reused = 0;
  for (const slot of slots) {
    for (const ing of slot.key_ingredients) {
      total += 1;
      if (ing.from_pantry || pantryKeys.has(ing.item_key)) {
        reused += 1;
      }
    }
  }
  if (total === 0) return 0;
  return Math.round((reused / total) * 1000) / 1000;
}
