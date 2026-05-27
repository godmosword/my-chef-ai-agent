import { describe, expect, it } from "vitest";
import { parseManualPantryText } from "./manual-entry";

describe("parseManualPantryText", () => {
  it("parses comma-separated items", () => {
    const { items } = parseManualPantryText("番茄 3 顆、香菇 200g");
    expect(items.length).toBe(2);
    expect(items[0]!.raw_name).toBe("番茄");
  });

  it("handles mixed separators", () => {
    const { items } = parseManualPantryText("蛋 1 盒, 豆腐 2 盒。鹽 1 罐");
    expect(items.length).toBe(3);
  });

  it("returns empty for garbage", () => {
    const { items, invalid } = parseManualPantryText("   ");
    expect(items.length).toBe(0);
    expect(invalid.length).toBe(0);
  });
});
