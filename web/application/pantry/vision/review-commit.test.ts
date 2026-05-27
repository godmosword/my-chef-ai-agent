import { describe, expect, it } from "vitest";
import {
  confidenceLabel,
  itemsEligibleForCommit,
} from "./review-commit";
import type { EnrichedPantryInput } from "./map-to-pantry-inputs";

describe("pantry review commit", () => {
  const items: EnrichedPantryInput[] = [
    {
      raw_name: "番茄",
      confidence: 0.9,
      recognition_confidence: 0.9,
      source: "photo",
      selected: true,
    },
    {
      raw_name: "不明物",
      confidence: 0.3,
      recognition_confidence: 0.3,
      source: "photo",
      selected: true,
    },
    {
      raw_name: "衛生紙",
      confidence: 0.9,
      recognition_confidence: 0.9,
      source: "receipt",
      selected: false,
      is_likely_food: false,
    },
  ];

  it("marks confidence labels", () => {
    expect(confidenceLabel(0.9)).toBe("高信心");
    expect(confidenceLabel(0.6)).toBe("中信心");
    expect(confidenceLabel(0.2)).toBe("低信心");
  });

  it("excludes low confidence unedited from commit", () => {
    const eligible = itemsEligibleForCommit(items);
    expect(eligible).toHaveLength(1);
    expect(eligible[0]!.raw_name).toBe("番茄");
  });

  it("includes low confidence after user edit", () => {
    const edited = [...items];
    edited[1] = { ...edited[1]!, user_edited: true };
    expect(itemsEligibleForCommit(edited)).toHaveLength(2);
  });
});
