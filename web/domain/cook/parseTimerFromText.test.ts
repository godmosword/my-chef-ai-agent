import { describe, expect, it } from "vitest";
import { parseTimerFromText } from "./parseTimerFromText";

describe("parseTimerFromText", () => {
  it("parses 分鐘", () => {
    expect(parseTimerFromText("小火煮 5 分鐘")).toBe(300);
  });

  it("parses 分 without 鐘", () => {
    expect(parseTimerFromText("煎 3 分至金黃")).toBe(180);
  });

  it("parses 靜置", () => {
    expect(parseTimerFromText("靜置 10 分")).toBe(600);
  });

  it("parses 小時", () => {
    expect(parseTimerFromText("燉 1 小時")).toBe(3600);
  });

  it("returns undefined when no duration", () => {
    expect(parseTimerFromText("炒香後下料")).toBeUndefined();
  });
});
