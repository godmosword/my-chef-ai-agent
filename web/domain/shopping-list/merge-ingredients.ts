/**
 * MP-3 merge engine: aggregate slot needs, subtract pantry, assign aisle, estimate price.
 */
import {
  addQuantities,
  normalizeIngredientName,
} from "@/domain/pantry/pantry-normalization";
import type { PantryCategory } from "@/domain/pantry/pantry-types";
import type { PantryItem } from "@/domain/pantry/pantry-types";
import { formatQuantityDisplay } from "./format-quantity";
import { estimatePrice } from "./price-book";
import { resolveSection, type ShoppingSection } from "./sections";

const VAGUE_UNITS = new Set(["", "適量", "少許", "一些", "適當", "some"]);

export type IngredientNeed = {
  item_key: string;
  display_name: string;
  category: PantryCategory;
  quantity: number | null;
  unit: string | null;
  quantity_text?: string | null;
  source_slot_id: number;
};

export type MergedItem = {
  item_key: string;
  display_name: string;
  category: PantryCategory;
  section: ShoppingSection;
  quantity: number | null;
  unit: string | null;
  quantity_display: string;
  pantry_covered_quantity: number | null;
  pantry_covered_unit: string | null;
  net_need_quantity: number | null;
  net_need_unit: string | null;
  from_pantry_partial: boolean;
  pantry_coverage_note: string | null;
  source_slot_ids: number[];
  estimated_unit_price: number | null;
  estimated_total_price: number | null;
  needs_purchase: boolean;
};

type GroupAcc = {
  item_key: string;
  display_name: string;
  category: PantryCategory;
  displayNameCounts: Map<string, number>;
  quantity: number | null;
  unit: string | null;
  vague: boolean;
  quantity_text: string | null;
  /** Secondary dimension when units incomparable */
  extraLines: Array<{ quantity: number | null; unit: string | null; quantity_text: string | null }>;
  source_slot_ids: number[];
};

function isVague(
  quantity: number | null,
  unit: string | null,
  quantityText?: string | null,
): boolean {
  if (quantityText && VAGUE_UNITS.has(quantityText.trim())) return true;
  if (quantity == null) return true;
  const u = unit?.trim() ?? "";
  return VAGUE_UNITS.has(u);
}

function pickDisplayName(counts: Map<string, number>, fallback: string): string {
  let best = fallback;
  let max = 0;
  for (const [name, c] of counts) {
    if (c > max) {
      max = c;
      best = name;
    }
  }
  return best;
}

function sumPantryForKey(
  rows: PantryItem[],
): { quantity: number; unit: string } | null {
  let acc: { quantity: number; unit: string } | null = null;
  for (const row of rows) {
    if (row.quantity == null || !row.unit) continue;
    try {
      if (!acc) {
        acc = { quantity: row.quantity, unit: row.unit };
      } else {
        acc = addQuantities(acc.quantity, acc.unit, row.quantity, row.unit);
      }
    } catch {
      /* skip incompatible pantry rows */
    }
  }
  return acc;
}

function buildCoverageNote(
  pantryQty: number,
  pantryUnit: string,
  netQty: number,
  netUnit: string,
): string {
  const have = formatQuantityDisplay(pantryQty, pantryUnit);
  const need = formatQuantityDisplay(netQty, netUnit);
  return `已有 ${have}，再買 ${need}`;
}

export function mergeIngredientsFromPlan(
  needs: IngredientNeed[],
  pantryItems: PantryItem[],
): MergedItem[] {
  const byKey = new Map<string, GroupAcc>();

  for (const need of needs) {
    const vague = isVague(need.quantity, need.unit, need.quantity_text);
    if (!byKey.has(need.item_key)) {
      byKey.set(need.item_key, {
        item_key: need.item_key,
        display_name: need.display_name,
        category: need.category,
        displayNameCounts: new Map([[need.display_name, 1]]),
        quantity: vague ? null : need.quantity,
        unit: vague ? null : need.unit,
        vague,
        quantity_text: vague ? (need.quantity_text ?? need.unit ?? "適量") : null,
        extraLines: [],
        source_slot_ids: [need.source_slot_id],
      });
      continue;
    }

    const acc = byKey.get(need.item_key)!;
    acc.displayNameCounts.set(
      need.display_name,
      (acc.displayNameCounts.get(need.display_name) ?? 0) + 1,
    );
    acc.source_slot_ids.push(need.source_slot_id);

    if (vague || acc.vague) {
      acc.vague = true;
      if (!acc.quantity_text) {
        acc.quantity_text = need.quantity_text ?? need.unit ?? "適量";
      }
      continue;
    }

    if (
      acc.quantity != null &&
      need.quantity != null &&
      acc.unit &&
      need.unit
    ) {
      try {
        const summed = addQuantities(
          acc.quantity,
          acc.unit,
          need.quantity,
          need.unit,
        );
        acc.quantity = summed.quantity;
        acc.unit = summed.unit;
      } catch {
        acc.extraLines.push({
          quantity: need.quantity,
          unit: need.unit,
          quantity_text: null,
        });
      }
    }
  }

  const pantryByKey = new Map<string, PantryItem[]>();
  for (const p of pantryItems) {
    if (!pantryByKey.has(p.item_key)) pantryByKey.set(p.item_key, []);
    pantryByKey.get(p.item_key)!.push(p);
  }

  const out: MergedItem[] = [];

  for (const acc of byKey.values()) {
    const display_name = pickDisplayName(acc.displayNameCounts, acc.display_name);
    const section = resolveSection(acc.item_key, acc.category);
    const pantryRows = pantryByKey.get(acc.item_key) ?? [];
    const inPantry = pantryRows.length > 0;

    if (acc.vague) {
      if (inPantry) continue;
      const { unitPrice, totalPrice } = estimatePrice(
        acc.item_key,
        null,
        null,
        acc.category,
      );
      out.push({
        item_key: acc.item_key,
        display_name,
        category: acc.category,
        section,
        quantity: null,
        unit: null,
        quantity_display: formatQuantityDisplay(null, null, acc.quantity_text),
        pantry_covered_quantity: null,
        pantry_covered_unit: null,
        net_need_quantity: null,
        net_need_unit: null,
        from_pantry_partial: false,
        pantry_coverage_note: null,
        source_slot_ids: [...new Set(acc.source_slot_ids)],
        estimated_unit_price: unitPrice,
        estimated_total_price: totalPrice,
        needs_purchase: true,
      });
      continue;
    }

    let needQty = acc.quantity ?? 0;
    let needUnit = acc.unit ?? "個";
    let quantityDisplay = formatQuantityDisplay(needQty, needUnit);
    if (acc.extraLines.length) {
      const parts = [quantityDisplay];
      for (const ex of acc.extraLines) {
        parts.push(
          formatQuantityDisplay(ex.quantity, ex.unit, ex.quantity_text),
        );
      }
      quantityDisplay = parts.join(" 加上 ");
    }

    const pantrySum = sumPantryForKey(pantryRows);
    let from_pantry_partial = false;
    let pantry_coverage_note: string | null = null;
    let netQty = needQty;
    let netUnit = needUnit;
    let pantryCoveredQty: number | null = null;
    let pantryCoveredUnit: string | null = null;
    let needs_purchase = true;

    if (pantrySum) {
      let comparable = false;
      try {
        addQuantities(0, needUnit, pantrySum.quantity, pantrySum.unit);
        comparable = true;
      } catch {
        comparable = false;
      }

      if (!comparable) {
        pantry_coverage_note = `冰箱有 ${formatQuantityDisplay(pantrySum.quantity, pantrySum.unit)} ${display_name}，本次需要 ${quantityDisplay}（自行判斷）`;
      } else {
        const net = Math.max(0, needQty - pantrySum.quantity);
        if (net <= 0) {
          needs_purchase = false;
        } else {
          from_pantry_partial = true;
          pantryCoveredQty = pantrySum.quantity;
          pantryCoveredUnit = pantrySum.unit;
          netQty = net;
          netUnit = needUnit;
          pantry_coverage_note = buildCoverageNote(
            pantrySum.quantity,
            pantrySum.unit,
            netQty,
            netUnit,
          );
        }
      }
    }

    if (!needs_purchase) continue;

    const finalQty = from_pantry_partial ? netQty : needQty;
    const finalUnit = from_pantry_partial ? netUnit : needUnit;
    const finalDisplay = from_pantry_partial
      ? formatQuantityDisplay(netQty, netUnit)
      : quantityDisplay;

    const { unitPrice, totalPrice } = estimatePrice(
      acc.item_key,
      finalQty,
      finalUnit,
      acc.category,
    );

    out.push({
      item_key: acc.item_key,
      display_name,
      category: acc.category,
      section,
      quantity: finalQty,
      unit: finalUnit,
      quantity_display: finalDisplay,
      pantry_covered_quantity: pantryCoveredQty,
      pantry_covered_unit: pantryCoveredUnit,
      net_need_quantity: from_pantry_partial ? netQty : needQty,
      net_need_unit: finalUnit,
      from_pantry_partial,
      pantry_coverage_note,
      source_slot_ids: [...new Set(acc.source_slot_ids)],
      estimated_unit_price: unitPrice,
      estimated_total_price: totalPrice,
      needs_purchase: true,
    });
  }

  return out.sort((a, b) => a.section.localeCompare(b.section));
}

/** Build IngredientNeed[] from meal slots (excludes cooked/skipped/swapped_out). */
export function needsFromMealSlots(
  slots: Array<{
    id: number;
    status: string;
    key_ingredients: Array<{
      item_key: string;
      display_name: string;
      approx_quantity: number | null;
      approx_unit: string | null;
    }>;
  }>,
): IngredientNeed[] {
  const excluded = new Set(["cooked", "skipped", "swapped_out"]);
  const needs: IngredientNeed[] = [];

  for (const slot of slots) {
    if (excluded.has(slot.status)) continue;
    for (const ing of slot.key_ingredients) {
      const [keyFromName, , category] = normalizeIngredientName(ing.display_name);
      const unit = ing.approx_unit?.trim() ?? null;
      const vague = isVague(ing.approx_quantity, unit);
      needs.push({
        item_key: ing.item_key?.trim() || keyFromName,
        display_name: ing.display_name,
        category,
        quantity: vague ? null : ing.approx_quantity,
        unit: vague ? (unit || "適量") : unit,
        quantity_text: vague ? (unit || "適量") : null,
        source_slot_id: slot.id,
      });
    }
  }
  return needs;
}
