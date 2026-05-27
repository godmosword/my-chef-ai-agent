import { beforeEach, describe, expect, it, vi } from "vitest";
import { recognizeFridge } from "./pantry-vision";
import { toPantryInputs } from "./map-to-pantry-inputs";
import * as visionClient from "./gemini-vision-client";

vi.mock("./gemini-vision-client", () => ({
  callGeminiVisionJson: vi.fn(),
  extractJsonObject: vi.fn((raw: string) => JSON.parse(raw)),
}));

describe("recognizeFridge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses mixed confidence items", async () => {
    vi.mocked(visionClient.callGeminiVisionJson).mockResolvedValue(
      JSON.stringify({
        items: [
          { raw_name: "番茄", quantity_guess: "3 顆", confidence: 0.9, notes: null },
          { raw_name: "香菇", quantity_guess: "未知", confidence: 0.4, notes: null },
        ],
        overall_quality: "good",
        advice: null,
      }),
    );
    const result = await recognizeFridge(Buffer.from("img"), "image/jpeg");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.raw_name).toBe("番茄");
  });

  it("returns empty on timeout", async () => {
    vi.mocked(visionClient.callGeminiVisionJson).mockRejectedValue(new Error("abort"));
    const result = await recognizeFridge(Buffer.from("img"), "image/jpeg");
    expect(result.items).toEqual([]);
    expect(result.advice).toContain("辨識失敗");
  });

  it("to_pantry_inputs normalizes via PT-1", async () => {
    const result = {
      items: [
        { raw_name: "番茄", quantity_guess: "3 顆", confidence: 0.9, notes: null },
      ],
      overall_quality: "good" as const,
      advice: null,
    };
    const inputs = toPantryInputs(result);
    expect(inputs[0]!.raw_name).toBe("番茄");
    expect(inputs[0]!.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(inputs[0]!.source).toBe("photo");
  });
});
