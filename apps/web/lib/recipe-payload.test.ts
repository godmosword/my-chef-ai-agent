import { describe, expect, it } from "vitest";
import {
  GenerateRecipeRequestSchema,
  RecipePayloadSchema,
} from "@chef/shared-types";
import { aiRecipeToPayload, buildTagsFromContext, normalizeTag } from "./recipe-payload";

describe("recipe-payload", () => {
  it("normalizes tags", () => {
    expect(normalizeTag("  台式  ")).toBe("台式");
  });

  it("builds tags from context without duplicates", () => {
    const tags = buildTagsFromContext(["台式", "快手"], "川菜", ["台式"]);
    expect(tags.map((t) => t.tag)).toEqual(["台式", "快手", "川菜"]);
  });

  it("maps AI recipe to API payload with ids", () => {
    const payload = aiRecipeToPayload(
      {
        recipe_name: "番茄炒蛋",
        theme: "家常",
        steps: ["打蛋", "炒蛋"],
      },
      { id: "550e8400-e29b-41d4-a716-446655440000", version_no: 1 },
    );
    const parsed = RecipePayloadSchema.parse(payload);
    expect(parsed.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parsed.recipe_name).toBe("番茄炒蛋");
  });
});

describe("shared-types recipe schemas", () => {
  it("validates generate request", () => {
    const r = GenerateRecipeRequestSchema.parse({
      message: "番茄炒蛋",
      context_tags: ["家常"],
    });
    expect(r.message).toBe("番茄炒蛋");
  });
});
