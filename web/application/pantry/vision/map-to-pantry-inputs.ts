import {
  normalizeIngredientName,
  normalizeQuantityAndUnit,
} from "@/domain/pantry/pantry-normalization";
import type { PantryCategory } from "@/domain/pantry/pantry-types";
import type { PantryItemInput } from "@/platform/db/pantry";
import type { FridgeRecognitionResult } from "./pantry-vision";
import { parseReceiptDate, type ReceiptParseResult } from "./receipt-ocr";

const EXPIRY_DEFAULTS_DAYS: Record<string, number> = {
  vegetable: 5,
  fruit: 5,
  meat: 3,
  seafood: 2,
  egg_dairy: 14,
  bean_tofu: 7,
  seasoning: 180,
  oil: 365,
  sauce: 90,
  spice: 365,
  dry_goods: 180,
  frozen: 30,
  beverage: 14,
  snack: 30,
  other: 7,
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function estimateExpiresAt(
  category: string,
  purchasedAt: string,
): string {
  const days =
    EXPIRY_DEFAULTS_DAYS[category] ?? EXPIRY_DEFAULTS_DAYS.other ?? 7;
  return addDays(purchasedAt, days);
}

function parseQuantityGuess(
  guess: string | null | undefined,
): { raw_quantity?: string | number; raw_unit?: string } {
  if (!guess || guess === "未知" || !guess.trim()) return {};
  const trimmed = guess.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return { raw_quantity: parts[0], raw_unit: parts.slice(1).join(" ") };
  }
  return { raw_quantity: trimmed };
}

export function toPantryInputs(
  result: FridgeRecognitionResult,
  options?: { default_location?: string; purchased_at?: string },
): PantryItemInput[] {
  const purchasedAt =
    options?.purchased_at ?? new Date().toISOString().slice(0, 10);
  const location = (options?.default_location ?? "fridge_main") as PantryItemInput["location"];

  return result.items.map((item) => {
    const [, , category] = normalizeIngredientName(item.raw_name);
    const qtyParts = parseQuantityGuess(item.quantity_guess);
    const [quantity, unit, quantityText] = normalizeQuantityAndUnit(
      qtyParts.raw_quantity,
      qtyParts.raw_unit,
    );
    return {
      raw_name: item.raw_name,
      raw_quantity: quantity ?? qtyParts.raw_quantity,
      raw_unit: unit ?? qtyParts.raw_unit,
      expires_at: estimateExpiresAt(category, purchasedAt),
      location,
      source: "photo",
      confidence: item.confidence,
      notes: item.notes ?? undefined,
      purchased_at: purchasedAt,
    };
  });
}

export function receiptToPantryInputs(
  result: ReceiptParseResult,
  options?: { only_food?: boolean },
): PantryItemInput[] {
  const onlyFood = options?.only_food !== false;
  const purchasedAt =
    parseReceiptDate(result.purchased_at) ??
    new Date().toISOString().slice(0, 10);

  const lines = result.items.filter(
    (line) => !onlyFood || line.is_likely_food,
  );

  return lines.map((line) => {
    const [, , category] = normalizeIngredientName(line.raw_name);
    const qtyParts = parseQuantityGuess(line.quantity_text);
    const [quantity, unit, quantityText] = normalizeQuantityAndUnit(
      qtyParts.raw_quantity,
      qtyParts.raw_unit,
    );
    return {
      raw_name: line.raw_name,
      raw_quantity: quantity ?? qtyParts.raw_quantity,
      raw_unit: unit ?? qtyParts.raw_unit,
      expires_at: estimateExpiresAt(category, purchasedAt),
      location: "fridge_main",
      source: "receipt",
      confidence: line.confidence,
      purchased_at: purchasedAt,
    };
  });
}

export type EnrichedPantryInput = PantryItemInput & {
  item_key?: string;
  display_name?: string;
  category?: PantryCategory | string;
  recognition_confidence?: number;
  user_edited?: boolean;
  selected?: boolean;
  unit_price?: number | null;
  is_likely_food?: boolean;
  quantity_text?: string;
  purchased_at?: string | null;
};

export function enrichPantryInput(
  input: PantryItemInput,
  extras?: Partial<EnrichedPantryInput>,
): EnrichedPantryInput {
  const [itemKey, canonical, category] = normalizeIngredientName(input.raw_name);
  return {
    ...input,
    item_key: itemKey,
    display_name: input.raw_name.trim() || canonical,
    category: category,
    recognition_confidence: input.confidence ?? 1,
    selected: extras?.selected ?? true,
    ...extras,
  };
}

export function enrichFridgeItems(
  inputs: PantryItemInput[],
  recognition: FridgeRecognitionResult,
): EnrichedPantryInput[] {
  return inputs.map((input, i) =>
    enrichPantryInput(input, {
      recognition_confidence:
        recognition.items[i]?.confidence ?? input.confidence ?? 1,
    }),
  );
}

export function enrichReceiptItems(
  inputs: PantryItemInput[],
  lines: ReceiptParseResult["items"],
): EnrichedPantryInput[] {
  return inputs.map((input, i) => {
    const line = lines[i];
    return enrichPantryInput(input, {
      recognition_confidence: line?.confidence ?? input.confidence ?? 1,
      is_likely_food: line?.is_likely_food ?? true,
      selected: line?.is_likely_food ?? true,
      unit_price: line?.unit_price ?? null,
    });
  });
}
