/**
 * Price book for Taiwan supermarket items. Hand-curated baseline.
 * Updates: review quarterly (SHOPPING_PRICE_BOOK_VERSION). Source: 全聯/家樂福/PXMart mid-2026.
 * Future: live retailer API integration (P2).
 */
import type { PantryCategory } from "@/domain/pantry/pantry-types";

type PriceBookEntry =
  | { unit: string; price: number; unit_per_g?: false }
  | { unit_per_g: true; price_per_g: number };

/** ~80 common items; extend over time. */
const PRICE_BOOK_TWD: Record<string, PriceBookEntry> = {
  tomato: { unit: "piece", price: 12 },
  cherry_tomato: { unit: "pack", price: 49 },
  scallion: { unit: "bunch", price: 25 },
  garlic: { unit: "head", price: 20 },
  ginger: { unit: "piece", price: 15 },
  cabbage: { unit: "head", price: 45 },
  napa_cabbage: { unit: "head", price: 55 },
  spinach: { unit: "bunch", price: 30 },
  broccoli: { unit: "head", price: 49 },
  bok_choy: { unit: "bunch", price: 35 },
  carrot: { unit: "piece", price: 25 },
  onion: { unit: "piece", price: 20 },
  potato: { unit: "piece", price: 15 },
  sweet_potato: { unit: "piece", price: 20 },
  cucumber: { unit: "piece", price: 25 },
  eggplant: { unit: "piece", price: 30 },
  chicken_breast: { unit_per_g: true, price_per_g: 0.4 },
  chicken_leg: { unit_per_g: true, price_per_g: 0.3 },
  chicken_thigh: { unit_per_g: true, price_per_g: 0.35 },
  pork: { unit_per_g: true, price_per_g: 0.45 },
  ground_pork: { unit_per_g: true, price_per_g: 0.5 },
  beef: { unit_per_g: true, price_per_g: 1.2 },
  fish_fillet: { unit_per_g: true, price_per_g: 0.8 },
  shrimp: { unit_per_g: true, price_per_g: 1.0 },
  egg: { unit: "piece", price: 8 },
  milk: { unit: "bottle", price: 79 },
  tofu: { unit: "box", price: 25 },
  firm_tofu: { unit: "box", price: 28 },
  rice: { unit_per_g: true, price_per_g: 0.08 },
  soy_sauce: { unit: "bottle", price: 79 },
  cooking_oil: { unit: "bottle", price: 159 },
  salt: { unit: "pack", price: 25 },
  sugar: { unit: "pack", price: 35 },
  flour: { unit: "pack", price: 55 },
  noodles: { unit: "pack", price: 45 },
  apple: { unit: "piece", price: 25 },
  banana: { unit: "piece", price: 12 },
  lemon: { unit: "piece", price: 15 },
  cilantro: { unit: "bunch", price: 20 },
  basil: { unit: "bunch", price: 25 },
  mushroom: { unit: "pack", price: 49 },
  enoki: { unit: "pack", price: 39 },
  butter: { unit: "pack", price: 89 },
  cheese: { unit: "pack", price: 99 },
};

const CATEGORY_DEFAULT_PRICE: Partial<
  Record<PantryCategory, { unit_per_g: true; price_per_g: number } | { unit: string; price: number }>
> = {
  vegetable: { unit_per_g: true, price_per_g: 0.15 },
  fruit: { unit_per_g: true, price_per_g: 0.3 },
  meat: { unit_per_g: true, price_per_g: 0.5 },
  seafood: { unit_per_g: true, price_per_g: 0.8 },
  egg_dairy: { unit: "piece", price: 40 },
  bean_tofu: { unit: "box", price: 30 },
  grain: { unit_per_g: true, price_per_g: 0.1 },
  dry_goods: { unit: "pack", price: 50 },
  seasoning: { unit: "bottle", price: 60 },
  sauce: { unit: "bottle", price: 70 },
  oil: { unit: "bottle", price: 120 },
  spice: { unit: "pack", price: 40 },
  frozen: { unit: "pack", price: 80 },
  beverage: { unit: "bottle", price: 35 },
  snack: { unit: "pack", price: 45 },
};

export function estimatePrice(
  itemKey: string,
  quantity: number | null,
  unit: string | null,
  category: PantryCategory,
): { unitPrice: number | null; totalPrice: number | null; confidence: number } {
  const book = PRICE_BOOK_TWD[itemKey];
  if (book && quantity != null && quantity > 0) {
    if ("unit_per_g" in book && book.unit_per_g) {
      const grams =
        unit === "kg" ? quantity * 1000 : unit === "g" || !unit ? quantity : null;
      if (grams != null) {
        const total = Math.round(grams * book.price_per_g);
        return {
          unitPrice: book.price_per_g,
          totalPrice: total,
          confidence: 0.7,
        };
      }
    } else if ("price" in book) {
      const total = Math.round(quantity * book.price);
      return {
        unitPrice: book.price,
        totalPrice: total,
        confidence: 0.75,
      };
    }
  }

  const catDefault = CATEGORY_DEFAULT_PRICE[category];
  if (catDefault && quantity != null && quantity > 0) {
    if ("unit_per_g" in catDefault && catDefault.unit_per_g) {
      const grams =
        unit === "kg" ? quantity * 1000 : unit === "g" || !unit ? quantity : null;
      if (grams != null) {
        return {
          unitPrice: catDefault.price_per_g,
          totalPrice: Math.round(grams * catDefault.price_per_g),
          confidence: 0.4,
        };
      }
    } else if ("price" in catDefault) {
      return {
        unitPrice: catDefault.price,
        totalPrice: Math.round(quantity * catDefault.price),
        confidence: 0.35,
      };
    }
  }

  return { unitPrice: null, totalPrice: null, confidence: 0 };
}
