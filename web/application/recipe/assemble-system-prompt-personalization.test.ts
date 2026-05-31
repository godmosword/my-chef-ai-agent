import { describe, expect, it } from "vitest";
import { assembleRecipeSystemPrompt } from "./assemble-system-prompt";
import { buildPersonalizationBlock } from "@/application/personalization/personalization-context";
import type { TasteProfile } from "@/platform/db/personalization";

describe("assembleRecipeSystemPrompt personalization", () => {
  it("includes block when populated", () => {
    const profile: TasteProfile = {
      tenant_id: "default",
      user_id: "u1",
      spice_tolerance: 1,
      sweetness_preference: null,
      saltiness_preference: null,
      oil_preference: null,
      allergies: ["花生"],
      dislikes: [],
      loved_ingredients: [],
      loved_dishes: [],
      regenerated_dishes: [],
      dietary_restrictions: [],
      preferred_cuisines: [],
      disliked_cuisines: [],
      cooking_skill_level: null,
      typical_cooking_time_min: null,
      notes: null,
      confidence_score: 0.5,
      onboarding_status: "completed",
      created_at: "",
      updated_at: "",
    };
    const block = buildPersonalizationBlock(profile, []);
    const prompt = assembleRecipeSystemPrompt({
      prefs: null,
      currentCuisine: null,
      personalizationBlock: block,
    });
    expect(prompt).toContain("【使用者個人化資訊】");
    expect(prompt).toContain("花生");
  });

  it("omits section when block empty", () => {
    const prompt = assembleRecipeSystemPrompt({
      prefs: null,
      currentCuisine: null,
      personalizationBlock: {
        hard_constraints: [],
        soft_preferences: [],
        household_notes: [],
        recent_dishes_to_avoid: [],
        skill_and_time: null,
        confidence: 0,
        token_estimate: 0,
        is_empty: true,
      },
    });
    expect(prompt).not.toContain("【使用者個人化資訊】");
  });
});
