import {
  addQuantities,
  normalizeIngredientName,
  normalizeQuantityAndUnit,
} from "@/domain/pantry/pantry-normalization";
import type { PantryItem } from "@/platform/db/pantry";
import type { AggregatedIngredient, CandidateSlot } from "./types";
import { ingredientNameToKey } from "./validate-plan";

const VAGUE_UNITS = new Set(["", "適量", "少許", "一些", "適當"]);

export function computeAggregatedIngredientNeeds(
  slots: CandidateSlot[],
  pantry: PantryItem[],
): AggregatedIngredient[] {
  type Acc = {
    item_key: string;
    display_name: string;
    quantity: number | null;
    unit: string | null;
    vague: boolean;
  };

  const byKey = new Map<string, Acc>();

  for (const slot of slots) {
    for (const ing of slot.key_ingredients) {
      const key = ing.item_key || ingredientNameToKey(ing.display_name);
      const unit = ing.approx_unit?.trim() ?? "";
      const vague =
        ing.approx_quantity == null ||
        VAGUE_UNITS.has(unit) ||
        VAGUE_UNITS.has(String(ing.approx_quantity));

      if (!byKey.has(key)) {
        byKey.set(key, {
          item_key: key,
          display_name: ing.display_name,
          quantity: vague ? null : ing.approx_quantity,
          unit: vague ? null : unit || null,
          vague,
        });
        continue;
      }

      const acc = byKey.get(key)!;
      if (vague || acc.vague) {
        acc.vague = true;
        continue;
      }
      if (
        acc.quantity != null &&
        ing.approx_quantity != null &&
        acc.unit &&
        unit
      ) {
        try {
          const summed = addQuantities(
            acc.quantity,
            acc.unit,
            ing.approx_quantity,
            unit,
          );
          acc.quantity = summed.quantity;
          acc.unit = summed.unit;
        } catch {
          acc.vague = true;
        }
      }
    }
  }

  const pantryByKey = new Map<string, PantryItem[]>();
  for (const p of pantry) {
    if (!pantryByKey.has(p.item_key)) pantryByKey.set(p.item_key, []);
    pantryByKey.get(p.item_key)!.push(p);
  }

  const out: AggregatedIngredient[] = [];
  for (const acc of byKey.values()) {
    if (acc.vague) {
      out.push({
        item_key: acc.item_key,
        display_name: acc.display_name,
        net_quantity: null,
        unit: null,
        vague: true,
      });
      continue;
    }

    let available = 0;
    let availableUnit = acc.unit ?? "個";
    const pantryRows = pantryByKey.get(acc.item_key) ?? [];
    for (const row of pantryRows) {
      if (row.quantity != null && row.unit) {
        try {
          if (available === 0) {
            available = row.quantity;
            availableUnit = row.unit;
          } else {
            const summed = addQuantities(
              available,
              availableUnit,
              row.quantity,
              row.unit,
            );
            available = summed.quantity;
            availableUnit = summed.unit;
          }
        } catch {
          /* skip incompatible */
        }
      }
    }
    const unit = availableUnit;

    const need = acc.quantity ?? 0;
    const net = Math.max(0, need - available);
    out.push({
      item_key: acc.item_key,
      display_name: acc.display_name,
      net_quantity: net > 0 ? net : 0,
      unit: acc.unit,
      vague: false,
    });
  }
  return out;
}

/** Parse "2 顆" style strings from LLM into quantity fields */
export function parseApproxQuantity(raw: string | number | null | undefined): {
  quantity: number | null;
  unit: string | null;
} {
  if (raw == null) return { quantity: null, unit: null };
  if (typeof raw === "number") return { quantity: raw, unit: null };
  const s = String(raw).trim();
  if (VAGUE_UNITS.has(s)) return { quantity: null, unit: s };
  const [q, u] = normalizeQuantityAndUnit(s, null);
  return { quantity: q, unit: u };
}
