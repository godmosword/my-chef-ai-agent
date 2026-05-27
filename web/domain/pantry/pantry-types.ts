/** Controlled vocab for pantry item categories (PT-1). */

export const PANTRY_CATEGORIES = [
  "vegetable",
  "fruit",
  "meat",
  "seafood",
  "egg_dairy",
  "grain",
  "bean_tofu",
  "seasoning",
  "oil",
  "sauce",
  "spice",
  "dry_goods",
  "frozen",
  "beverage",
  "snack",
  "other",
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export const PANTRY_LOCATIONS = [
  "fridge_main",
  "fridge_door",
  "freezer",
  "pantry",
  "counter",
  "other",
] as const;

export type PantryLocation = (typeof PANTRY_LOCATIONS)[number];

export const PANTRY_SOURCES = [
  "manual",
  "photo",
  "receipt",
  "recipe_consumed",
  "auto",
] as const;

export type PantrySource = (typeof PANTRY_SOURCES)[number];

export type UnitDimension = "weight" | "volume" | "count" | "vague";

export const PANTRY_UNITS: Record<
  string,
  { labelZh: string; dimension: UnitDimension }
> = {
  g: { labelZh: "公克", dimension: "weight" },
  kg: { labelZh: "公斤", dimension: "weight" },
  oz: { labelZh: "盎司", dimension: "weight" },
  ml: { labelZh: "毫升", dimension: "volume" },
  l: { labelZh: "公升", dimension: "volume" },
  tsp: { labelZh: "茶匙", dimension: "volume" },
  tbsp: { labelZh: "湯匙", dimension: "volume" },
  cup: { labelZh: "杯", dimension: "volume" },
  piece: { labelZh: "個", dimension: "count" },
  clove: { labelZh: "瓣", dimension: "count" },
  bunch: { labelZh: "把", dimension: "count" },
  head: { labelZh: "顆", dimension: "count" },
  slice: { labelZh: "片", dimension: "count" },
  stick: { labelZh: "根", dimension: "count" },
  can: { labelZh: "罐", dimension: "count" },
  bottle: { labelZh: "瓶", dimension: "count" },
  pack: { labelZh: "包", dimension: "count" },
  box: { labelZh: "盒", dimension: "count" },
  block: { labelZh: "塊", dimension: "count" },
  some: { labelZh: "適量", dimension: "vague" },
  /** Internal only — converted to g before persist */
  tael: { labelZh: "兩", dimension: "weight" },
  catty: { labelZh: "斤", dimension: "weight" },
};

export type MergeStrategy =
  | "always_merge"
  | "merge_if_same_expiry"
  | "never_merge";
