import { describe, expect, it } from "vitest";
import type { PantryItem } from "@/domain/pantry/pantry-types";
import {
  mergeIngredientsFromPlan,
  type IngredientNeed,
} from "./merge-ingredients";
import { formatQuantityDisplay } from "./format-quantity";
import { estimatePrice } from "./price-book";

function need(
  partial: Partial<IngredientNeed> & Pick<IngredientNeed, "item_key" | "display_name">,
): IngredientNeed {
  return {
    category: "vegetable",
    quantity: 5,
    unit: "piece",
    source_slot_id: 1,
    ...partial,
  };
}

function pantryRow(
  item_key: string,
  quantity: number,
  unit: string,
): PantryItem {
  return {
    id: 1,
    tenant_id: "t",
    user_id: "u",
    item_key,
    display_name: item_key,
    category: "vegetable",
    quantity,
    unit,
    quantity_text: null,
    location: "fridge_main",
    expires_at: null,
    purchased_at: "2026-05-01",
    source: "manual",
    confidence: 1,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("mergeIngredientsFromPlan", () => {
  it("merges same item_key quantities", () => {
    const merged = mergeIngredientsFromPlan(
      [
        need({ item_key: "tomato", display_name: "牛番茄", quantity: 5, source_slot_id: 1 }),
        need({ item_key: "tomato", display_name: "番茄", quantity: 3, source_slot_id: 2 }),
      ],
      [],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(8);
    expect(merged[0].source_slot_ids).toEqual([1, 2]);
  });

  it("excludes fully pantry-covered items", () => {
    const merged = mergeIngredientsFromPlan(
      [need({ item_key: "tomato", display_name: "番茄", quantity: 8 })],
      [pantryRow("tomato", 10, "piece")],
    );
    expect(merged).toHaveLength(0);
  });

  it("partial pantry coverage", () => {
    const merged = mergeIngredientsFromPlan(
      [need({ item_key: "tomato", display_name: "番茄", quantity: 8 })],
      [pantryRow("tomato", 5, "piece")],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].from_pantry_partial).toBe(true);
    expect(merged[0].quantity).toBe(3);
    expect(merged[0].pantry_coverage_note).toContain("已有");
  });

  it("keeps vague need when not in pantry", () => {
    const merged = mergeIngredientsFromPlan(
      [
        need({
          item_key: "salt",
          display_name: "鹽",
          quantity: null,
          unit: "適量",
          quantity_text: "適量",
          category: "seasoning",
        }),
      ],
      [],
    );
    expect(merged[0].quantity_display).toBe("適量");
  });

  it("drops vague need when item in pantry", () => {
    const merged = mergeIngredientsFromPlan(
      [
        need({
          item_key: "salt",
          display_name: "鹽",
          quantity: null,
          unit: "適量",
          quantity_text: "適量",
          category: "seasoning",
        }),
      ],
      [pantryRow("salt", 1, "pack")],
    );
    expect(merged).toHaveLength(0);
  });

  it("assigns ginger to produce_veg", () => {
    const merged = mergeIngredientsFromPlan(
      [need({ item_key: "ginger", display_name: "薑", category: "spice" })],
      [],
    );
    expect(merged[0].section).toBe("produce_veg");
  });
});

describe("formatQuantityDisplay", () => {
  it("formats kg from grams", () => {
    expect(formatQuantityDisplay(1500, "g")).toBe("1.5 公斤");
  });
});

describe("estimatePrice", () => {
  it("prices tomato from book", () => {
    const { totalPrice } = estimatePrice("tomato", 5, "piece", "vegetable");
    expect(totalPrice).toBe(60);
  });
});
