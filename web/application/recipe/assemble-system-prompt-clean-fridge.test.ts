import { describe, expect, it } from "vitest";
import { assembleRecipeSystemPrompt } from "./assemble-system-prompt";

describe("assembleRecipeSystemPrompt clean fridge order", () => {
  it("places clean fridge block before personalization", () => {
    const prompt = assembleRecipeSystemPrompt({
      prefs: null,
      currentCuisine: null,
      cleanFridgeBlock: "※ 清冰箱模式",
      personalizationBlock: {
        hard_constraints: ["避開花生"],
        soft_preferences: [],
        household_notes: [],
        recent_dishes_to_avoid: [],
        skill_and_time: null,
        confidence: 0.5,
        token_estimate: 10,
        is_empty: false,
      },
    });
    const cleanIdx = prompt.indexOf("清冰箱");
    const persIdx = prompt.indexOf("避開花生");
    expect(cleanIdx).toBeGreaterThan(-1);
    expect(persIdx).toBeGreaterThan(cleanIdx);
  });
});
