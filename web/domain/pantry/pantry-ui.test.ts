import { describe, expect, it } from "vitest";
import {
  categorizeForDisplay,
  formatQuantityForDisplay,
  expiryLabel,
} from "./pantry-ui";
import type { PantryDisplayItem } from "./pantry-ui";

function item(partial: Partial<PantryDisplayItem>): PantryDisplayItem {
  return {
    item_key: "x",
    display_name: "測試",
    category: "vegetable",
    quantity: null,
    unit: null,
    quantity_text: null,
    location: "fridge_main",
    expires_at: null,
    confidence: 1,
    ...partial,
  };
}

describe("formatQuantityForDisplay", () => {
  it("prefers quantity_text", () => {
    expect(
      formatQuantityForDisplay(item({ quantity_text: "一把" })),
    ).toBe("一把");
  });

  it("formats g with kg conversion", () => {
    expect(
      formatQuantityForDisplay(item({ quantity: 1500, unit: "g" })),
    ).toBe("1.5 公斤");
  });

  it("falls back to 未知", () => {
    expect(formatQuantityForDisplay(item({}))).toBe("未知");
  });
});

describe("expiryLabel", () => {
  it("shows expired days", () => {
    const { text, urgency } = expiryLabel(
      item({ expires_at: "2020-01-01" }),
      "2026-05-27",
      3,
    );
    expect(urgency).toBe("expired");
    expect(text).toContain("已過期");
  });

  it("shows urgent within warn window", () => {
    const { urgency } = expiryLabel(
      item({ expires_at: "2026-05-28" }),
      "2026-05-27",
      3,
    );
    expect(urgency).toBe("urgent");
  });
});

describe("categorizeForDisplay", () => {
  it("empty returns no groups", () => {
    expect(categorizeForDisplay([], "2026-05-27", 3)).toEqual([]);
  });

  it("orders expired before categories", () => {
    const groups = categorizeForDisplay(
      [
        item({
          display_name: "番茄",
          expires_at: "2020-01-01",
          category: "vegetable",
        }),
        item({
          display_name: "高麗菜",
          expires_at: "2099-01-01",
          category: "vegetable",
        }),
      ],
      "2026-05-27",
      3,
    );
    expect(groups[0]!.id).toBe("expired");
  });

  it("hides low confidence items", () => {
    const groups = categorizeForDisplay(
      [item({ confidence: 0.3 })],
      "2026-05-27",
      3,
    );
    expect(groups.length).toBe(0);
  });
});
