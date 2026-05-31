import { describe, expect, it } from "vitest";
import {
  AiRecipePayloadSchema,
  parseAiRecipeJson,
} from "./ai-recipe-payload";

describe("AiRecipePayloadSchema", () => {
  it("accepts minimal valid LLM payload", () => {
    const parsed = AiRecipePayloadSchema.safeParse({
      recipe_name: "番茄炒蛋",
      ingredients: [{ name: "雞蛋" }],
      steps: ["打蛋"],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts personalization_note extension", () => {
    const parsed = AiRecipePayloadSchema.safeParse({
      recipe_name: "味噌湯",
      personalization_note: "少鹽",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.personalization_note).toBe("少鹽");
    }
  });

  it("rejects invalid hero_status", () => {
    const parsed = AiRecipePayloadSchema.safeParse({
      recipe_name: "test",
      hero_status: "bogus",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseAiRecipeJson", () => {
  it("extracts JSON from fenced model output", () => {
    const raw = 'Here is the recipe:\n```json\n{"recipe_name":"咖哩","steps":["炒"]}\n```';
    const recipe = parseAiRecipeJson(raw);
    expect(recipe.recipe_name).toBe("咖哩");
  });

  it("throws when recipe_name missing", () => {
    expect(() => parseAiRecipeJson('{"ingredients":[]}')).toThrow(
      "Missing recipe_name",
    );
  });
});
