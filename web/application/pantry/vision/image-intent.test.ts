import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyImageIntent } from "./image-intent";
import * as visionClient from "./gemini-vision-client";

vi.mock("./gemini-vision-client", () => ({
  callGeminiVisionJson: vi.fn(),
  extractJsonObject: vi.fn((raw: string) => JSON.parse(raw)),
}));

describe("classifyImageIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fridge_contents on high confidence", async () => {
    vi.mocked(visionClient.callGeminiVisionJson).mockResolvedValue(
      JSON.stringify({ intent: "fridge_contents", confidence: 0.9 }),
    );
    const [intent, conf] = await classifyImageIntent(Buffer.from("x"), "image/jpeg");
    expect(intent).toBe("fridge_contents");
    expect(conf).toBe(0.9);
  });

  it("returns other on timeout", async () => {
    vi.mocked(visionClient.callGeminiVisionJson).mockRejectedValue(new Error("timeout"));
    const [intent, conf] = await classifyImageIntent(Buffer.from("x"), "image/jpeg");
    expect(intent).toBe("other");
    expect(conf).toBe(0);
  });

  it("returns other on malformed JSON", async () => {
    vi.mocked(visionClient.callGeminiVisionJson).mockResolvedValue("not json");
    vi.mocked(visionClient.extractJsonObject).mockImplementation(() => {
      throw new Error("parse fail");
    });
    const [intent, conf] = await classifyImageIntent(Buffer.from("x"), "image/jpeg");
    expect(intent).toBe("other");
    expect(conf).toBe(0);
  });
});
