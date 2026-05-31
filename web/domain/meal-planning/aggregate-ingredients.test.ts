import { describe, expect, it } from "vitest";
import type { PantryItem } from "@/domain/pantry/pantry-types";
import { computeAggregatedIngredientNeeds } from "./aggregate-ingredients";
import type { CandidateSlot } from "./types";

function pantryRow(
  item_key: string,
  display_name: string,
  quantity: number,
  unit: string,
): PantryItem {
  return {
    id: 1,
    tenant_id: "default",
    user_id: "u",
    item_key,
    display_name,
    category: null,
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

describe("computeAggregatedIngredientNeeds", () => {
  it("aggregates half cabbage twice to one need", () => {
    const slots: CandidateSlot[] = [
      {
        slot_date: "2026-05-27",
        meal_type: "dinner",
        slot_index: 0,
        dish_title: "A",
        key_ingredients: [
          {
            item_key: "cabbage",
            display_name: "高麗菜",
            approx_quantity: 200,
            approx_unit: "g",
            from_pantry: false,
            urgency: "none",
          },
        ],
      },
      {
        slot_date: "2026-05-28",
        meal_type: "dinner",
        slot_index: 0,
        dish_title: "B",
        key_ingredients: [
          {
            item_key: "cabbage",
            display_name: "高麗菜",
            approx_quantity: 200,
            approx_unit: "g",
            from_pantry: false,
            urgency: "none",
          },
        ],
      },
    ];
    const agg = computeAggregatedIngredientNeeds(slots, []);
    const cabbage = agg.find((a) => a.item_key === "cabbage");
    expect(cabbage?.net_quantity).toBe(400);
  });

  it("pantry subtraction", () => {
    const slots: CandidateSlot[] = [
      {
        slot_date: "2026-05-27",
        meal_type: "dinner",
        slot_index: 0,
        dish_title: "番茄炒蛋",
        key_ingredients: [
          {
            item_key: "tomato",
            display_name: "番茄",
            approx_quantity: 2,
            approx_unit: "個",
            from_pantry: true,
            urgency: "none",
          },
        ],
      },
    ];
    const pantry = [pantryRow("tomato", "番茄", 3, "個")];
    const agg = computeAggregatedIngredientNeeds(slots, pantry);
    expect(agg[0]?.net_quantity).toBe(0);
  });

  it("vague quantity listed separately", () => {
    const slots: CandidateSlot[] = [
      {
        slot_date: "2026-05-27",
        meal_type: "dinner",
        slot_index: 0,
        dish_title: "A",
        key_ingredients: [
          {
            item_key: "salt",
            display_name: "鹽",
            approx_quantity: null,
            approx_unit: "適量",
            from_pantry: false,
            urgency: "none",
          },
        ],
      },
    ];
    const agg = computeAggregatedIngredientNeeds(slots, []);
    expect(agg[0]?.vague).toBe(true);
  });
});
