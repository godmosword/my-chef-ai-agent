import { describe, expect, it } from "vitest";
import { computePantryReuseScore } from "./pantry-reuse-score";
import type { CandidateSlot } from "./types";
import type { PantryItem } from "@/domain/pantry/pantry-types";

describe("computePantryReuseScore", () => {
  it("all from pantry ~1.0", () => {
    const slots: CandidateSlot[] = [
      {
        slot_date: "2026-05-27",
        meal_type: "dinner",
        slot_index: 0,
        dish_title: "A",
        key_ingredients: [
          {
            item_key: "tomato",
            display_name: "番茄",
            approx_quantity: 1,
            approx_unit: "顆",
            from_pantry: true,
            urgency: "none",
          },
        ],
      },
    ];
    const pantry = [{ item_key: "tomato" } as PantryItem];
    expect(computePantryReuseScore(slots, pantry)).toBe(1);
  });

  it("none from pantry ~0", () => {
    const slots: CandidateSlot[] = [
      {
        slot_date: "2026-05-27",
        meal_type: "dinner",
        slot_index: 0,
        dish_title: "A",
        key_ingredients: [
          {
            item_key: "beef",
            display_name: "牛肉",
            approx_quantity: 1,
            approx_unit: "克",
            from_pantry: false,
            urgency: "none",
          },
        ],
      },
    ];
    expect(computePantryReuseScore(slots, [])).toBe(0);
  });
});
