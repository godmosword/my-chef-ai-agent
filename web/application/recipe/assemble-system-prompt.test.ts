import { describe, expect, it, vi } from "vitest";
import { assembleRecipeSystemPrompt } from "./assemble-system-prompt";
import { SYSTEM_PROMPT } from "@/domain/recipe/prompts";
import { buildPersonalizationBlock } from "@/application/personalization/personalization-context";
import type { TasteProfile } from "@/platform/db/personalization";
import * as injectionConfig from "@/platform/config/personalization-injection-config";

describe("assembleRecipeSystemPrompt", () => {
  it("includes personalization between base and deep research", () => {
    const profile: TasteProfile = {
      tenant_id: "default",
      user_id: "u1",
      spice_tolerance: null,
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
      confidence_score: 0.8,
      created_at: "",
      updated_at: "",
    };
    const block = buildPersonalizationBlock(profile, []);
    const deep = "【深度研究】測試摘要";
    const prompt = assembleRecipeSystemPrompt({
      prefs: null,
      currentCuisine: null,
      personalizationBlock: block,
      deepResearchSummary: deep,
    });

    const baseIdx = prompt.indexOf(SYSTEM_PROMPT.slice(0, 20));
    const persIdx = prompt.indexOf("【使用者個人化資訊】");
    const deepIdx = prompt.indexOf(deep);
    expect(baseIdx).toBeGreaterThanOrEqual(0);
    expect(persIdx).toBeGreaterThan(baseIdx);
    expect(deepIdx).toBeGreaterThan(persIdx);
  });

  it("with injection disabled block still omitted when empty", () => {
    vi.spyOn(injectionConfig, "isPersonalizationInjectionEnabled").mockReturnValue(
      false,
    );
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

  it("ordering base → personalization → deep_research", () => {
    const block = buildPersonalizationBlock(
      {
        tenant_id: "default",
        user_id: "u1",
        spice_tolerance: 1,
        sweetness_preference: null,
        saltiness_preference: null,
        oil_preference: null,
        allergies: [],
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
        created_at: "",
        updated_at: "",
      },
      [],
    );
    const deep = "DEEP_RESEARCH_MARKER";
    const prompt = assembleRecipeSystemPrompt({
      prefs: null,
      currentCuisine: "台式",
      personalizationBlock: block,
      deepResearchSummary: deep,
    });
    expect(prompt.indexOf("DEEP_RESEARCH_MARKER")).toBeGreaterThan(
      prompt.indexOf("【使用者個人化資訊】"),
    );
  });
});
