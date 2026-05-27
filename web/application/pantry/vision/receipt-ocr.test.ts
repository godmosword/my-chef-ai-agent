import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseReceipt, parseReceiptDate } from "./receipt-ocr";
import { receiptToPantryInputs } from "./map-to-pantry-inputs";
import * as visionClient from "./gemini-vision-client";

vi.mock("./gemini-vision-client", () => ({
  callGeminiVisionJson: vi.fn(),
  extractJsonObject: vi.fn((raw: string) => JSON.parse(raw)),
}));

describe("parseReceiptDate", () => {
  it("converts ROC slash date", () => {
    expect(parseReceiptDate("115/05/25")).toBe("2026-05-25");
  });

  it("converts 民國 date", () => {
    expect(parseReceiptDate("民國115年5月25日")).toBe("2026-05-25");
  });
});

describe("parseReceipt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("separates food and non-food", async () => {
    vi.mocked(visionClient.callGeminiVisionJson).mockResolvedValue(
      JSON.stringify({
        store_name: "全聯",
        purchased_at: "115/05/25",
        total_amount: 487,
        items: [
          {
            raw_name: "牛番茄",
            quantity_text: "1 包",
            unit_price: 49,
            total_price: 49,
            confidence: 0.9,
            is_likely_food: true,
          },
          {
            raw_name: "衛生紙",
            quantity_text: "1 包",
            unit_price: 129,
            total_price: 129,
            confidence: 0.9,
            is_likely_food: false,
          },
        ],
        overall_quality: "good",
        advice: null,
      }),
    );
    const result = await parseReceipt(Buffer.from("r"), "image/jpeg");
    expect(result.store_name).toBe("全聯");
    expect(result.purchased_at).toBe("2026-05-25");
    expect(result.items.filter((i) => i.is_likely_food)).toHaveLength(1);
  });

  it("receipt_to_pantry_inputs only_food filters", () => {
    const result = {
      items: [
        {
          raw_name: "蛋",
          quantity_text: "1",
          unit_price: 1,
          total_price: 1,
          confidence: 0.9,
          is_likely_food: true,
        },
        {
          raw_name: "袋",
          quantity_text: "1",
          unit_price: 1,
          total_price: 1,
          confidence: 0.9,
          is_likely_food: false,
        },
      ],
      store_name: null,
      purchased_at: "2026-05-25",
      total_amount: null,
      overall_quality: "good",
      advice: null,
    };
    expect(receiptToPantryInputs(result, { only_food: true })).toHaveLength(1);
    expect(receiptToPantryInputs(result, { only_food: false })).toHaveLength(2);
  });

  it("returns empty on vision error", async () => {
    vi.mocked(visionClient.callGeminiVisionJson).mockRejectedValue(new Error("fail"));
    const result = await parseReceipt(Buffer.from("r"), "image/jpeg");
    expect(result.items).toEqual([]);
  });
});
