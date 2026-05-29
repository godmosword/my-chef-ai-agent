import { describe, expect, it } from "vitest";
import { buildConsumePreview } from "./meal-plan-slot-execution";
import type { MealSlotRow } from "@/platform/db/meal-planning";

function slotWithIngredients(): MealSlotRow {
  return {
    id: 1,
    meal_plan_id: 1,
    tenant_id: "t",
    user_id: "u",
    slot_date: "2026-05-28",
    meal_type: "dinner",
    slot_index: 0,
    dish_title: "炒菠菜",
    cuisine: null,
    estimated_time_min: 10,
    effort_level: null,
    key_ingredients: [
      {
        item_key: "spinach",
        display_name: "菠菜",
        approx_quantity: 1,
        approx_unit: "把",
        from_pantry: true,
        urgency: "urgent",
      },
      {
        item_key: "garlic",
        display_name: "蒜頭",
        approx_quantity: null,
        approx_unit: "適量",
        from_pantry: true,
        urgency: "normal",
      },
    ],
    estimated_cost: null,
    tags: [],
    rationale: null,
    full_recipe_json: null,
    full_recipe_generated_at: null,
    status: "planned",
    cooked_at: null,
    skipped_at: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("buildConsumePreview", () => {
  it("auto-ticks concrete quantities, skips 適量", () => {
    const pantry = [
      {
        id: 10,
        tenant_id: "t",
        user_id: "u",
        item_key: "spinach",
        display_name: "菠菜",
        category: "vegetable",
        quantity: 1,
        unit: "把",
        quantity_text: "1把",
        location: "fridge",
        expires_at: "2026-05-30",
        purchased_at: new Date().toISOString(),
        source: "manual",
        confidence: 1,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const lines = buildConsumePreview(
      slotWithIngredients().key_ingredients,
      pantry,
    );
    expect(lines[0]?.auto_tick).toBe(true);
    expect(lines[1]?.auto_tick).toBe(false);
    expect(lines[1]?.reason).toContain("適量");
  });
});
