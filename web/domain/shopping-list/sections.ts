/** Supermarket aisle sections for Taiwan shopping flow (MP-3). */

export const SHOPPING_SECTIONS = [
  "produce_veg",
  "produce_fruit",
  "meat",
  "seafood",
  "dairy_eggs",
  "frozen",
  "deli_prepared",
  "bakery",
  "pantry_dry",
  "pantry_canned",
  "condiments_sauces",
  "spices_herbs",
  "beverages",
  "snacks",
  "household",
  "other",
] as const;

export type ShoppingSection = (typeof SHOPPING_SECTIONS)[number];

export const SECTION_DISPLAY_ORDER: ShoppingSection[] = [
  "produce_veg",
  "produce_fruit",
  "meat",
  "seafood",
  "dairy_eggs",
  "frozen",
  "deli_prepared",
  "bakery",
  "pantry_dry",
  "pantry_canned",
  "condiments_sauces",
  "spices_herbs",
  "beverages",
  "snacks",
  "household",
  "other",
];

export const SECTION_LABELS: Record<ShoppingSection, string> = {
  produce_veg: "蔬果區",
  produce_fruit: "水果區",
  meat: "肉品區",
  seafood: "海鮮區",
  dairy_eggs: "乳製品・蛋",
  frozen: "冷凍食品",
  deli_prepared: "熟食・即食",
  bakery: "麵包烘焙",
  pantry_dry: "米麵乾貨",
  pantry_canned: "罐頭",
  condiments_sauces: "醬料調味",
  spices_herbs: "香料乾貨",
  beverages: "飲料",
  snacks: "零食",
  household: "家居用品",
  other: "其他",
};

import type { PantryCategory } from "@/domain/pantry/pantry-types";

export const CATEGORY_TO_SECTION: Record<PantryCategory, ShoppingSection> = {
  vegetable: "produce_veg",
  fruit: "produce_fruit",
  meat: "meat",
  seafood: "seafood",
  egg_dairy: "dairy_eggs",
  bean_tofu: "dairy_eggs",
  grain: "pantry_dry",
  dry_goods: "pantry_dry",
  seasoning: "condiments_sauces",
  sauce: "condiments_sauces",
  oil: "condiments_sauces",
  spice: "spices_herbs",
  frozen: "frozen",
  beverage: "beverages",
  snack: "snacks",
  other: "other",
};

/** Fresh aromatics live in produce, not dried spice aisle. */
export const ITEM_KEY_SECTION_OVERRIDES: Record<string, ShoppingSection> = {
  cilantro: "produce_veg",
  basil: "produce_veg",
  thai_basil: "produce_veg",
  ginger: "produce_veg",
  scallion: "produce_veg",
  garlic: "produce_veg",
  garlic_minced: "produce_veg",
  shallot: "produce_veg",
  leek: "produce_veg",
  chili: "produce_veg",
  bird_eye_chili: "produce_veg",
  lemon_grass: "produce_veg",
};

export function resolveSection(
  itemKey: string,
  category: PantryCategory,
): ShoppingSection {
  return (
    ITEM_KEY_SECTION_OVERRIDES[itemKey] ??
    CATEGORY_TO_SECTION[category] ??
    "other"
  );
}
