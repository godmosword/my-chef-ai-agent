import { describe, expect, it, vi } from "vitest";

vi.mock("@/domain/recipe/generate-recipe", () => ({
  generateRecipe: vi.fn().mockResolvedValue({
    recipe: { recipe_name: "番茄炒蛋", steps: ["炒"] },
  }),
}));

vi.mock("@/application/personalization/personalization-context", () => ({
  loadPersonalizationContext: vi.fn().mockResolvedValue({
    hard_constraints: [],
    soft_preferences: [],
    household_notes: [],
    recent_dishes_to_avoid: [],
    is_empty: true,
  }),
  renderPersonalizationBlock: vi.fn().mockReturnValue(""),
}));

const getSlot = vi.fn();
const saveRecipe = vi.fn();

vi.mock("@/platform/db/meal-planning", () => ({
  getMealSlot: (...args: unknown[]) => getSlot(...args),
  saveSlotFullRecipe: (...args: unknown[]) => saveRecipe(...args),
}));

import { expandSlotToFullRecipe } from "./meal-planner-expansion";
import { generateRecipe } from "@/domain/recipe/generate-recipe";

describe("expandSlotToFullRecipe", () => {
  it("returns cached when full_recipe_json exists", async () => {
    getSlot.mockResolvedValue({
      id: 1,
      full_recipe_json: { recipe_name: "cached" },
      dish_title: "番茄炒蛋",
      key_ingredients: [],
    });
    const result = await expandSlotToFullRecipe(1, "default", "u1");
    expect(generateRecipe).not.toHaveBeenCalled();
    expect(result?.full_recipe_json).toEqual({ recipe_name: "cached" });
  });

  it("generates and saves on first call", async () => {
    getSlot.mockResolvedValueOnce({
      id: 2,
      full_recipe_json: null,
      dish_title: "蒜炒菠菜",
      cuisine: "台式",
      estimated_time_min: 10,
      key_ingredients: [
        {
          item_key: "spinach",
          display_name: "菠菜",
          from_pantry: true,
          approx_quantity: 1,
          approx_unit: "把",
        },
      ],
    });
    saveRecipe.mockResolvedValue({
      id: 2,
      full_recipe_json: { recipe_name: "蒜炒菠菜" },
    });
    const result = await expandSlotToFullRecipe(2, "default", "u1");
    expect(generateRecipe).toHaveBeenCalled();
    expect(saveRecipe).toHaveBeenCalled();
    expect(result?.full_recipe_json).toBeTruthy();
  });
});
