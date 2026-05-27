import { describe, expect, it } from "vitest";
import { buildCleanFridgeSystemBlock } from "./clean-fridge-prompt";
import { isCleanFridgeMessage } from "./clean-fridge";

describe("clean fridge", () => {
  it("detects 清冰箱 messages", () => {
    expect(isCleanFridgeMessage("清冰箱的菜")).toBe(true);
    expect(isCleanFridgeMessage("番茄炒蛋")).toBe(false);
  });

  it("builds system block", () => {
    const block = buildCleanFridgeSystemBlock(["番茄(3 顆)", "蛋(10 顆)"]);
    expect(block).toContain("清冰箱");
    expect(block).toContain("番茄");
  });
});
