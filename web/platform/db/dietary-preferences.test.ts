import { describe, expect, it } from "vitest";
import {
  normalizeDietaryPreferences,
  dietaryPreferencesPromptText,
  type DietaryPreferences,
} from "./dietary-preferences";

describe("dietaryPreferencesPromptText", () => {
  it("includes custom avoid ingredients", () => {
    const prefs: DietaryPreferences = {
      tags: ["no_kiwi"],
      avoid_custom: "香菜、蝦",
    };
    const text = dietaryPreferencesPromptText(prefs);
    expect(text).toContain("奇異果");
    expect(text).toContain("香菜");
    expect(text).toContain("蝦");
  });

  it("returns null when empty", () => {
    expect(dietaryPreferencesPromptText({ tags: [], avoid_custom: "" })).toBeNull();
  });

  it("normalizes multiple saved avoid ingredients and ignores invalid preset keys", () => {
    expect(
      normalizeDietaryPreferences({
        tags: ["no_kiwi", "unknown", "no_nuts"],
        avoid_custom: " 香菜、蝦、花生 ",
      }),
    ).toEqual({
      tags: ["no_kiwi", "no_nuts"],
      avoid_custom: "香菜、蝦、花生",
    });
  });
});
