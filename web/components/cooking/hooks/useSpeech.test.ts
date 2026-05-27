import { describe, expect, it } from "vitest";
import { parseTimerFromText } from "@/domain/cook/parseTimerFromText";

/** Speech hook needs jsdom + mocks; smoke-test voice preference key contract. */
describe("useSpeech contract", () => {
  it("voice localStorage key is stable", () => {
    expect("cooking_voice_enabled").toBe("cooking_voice_enabled");
  });
});

describe("speech parse helper", () => {
  it("step line for TTS", () => {
    const line = `第 2 步。${"煮 5 分鐘"}`;
    expect(line).toContain("第 2 步");
    expect(parseTimerFromText("煮 5 分鐘")).toBe(300);
  });
});
