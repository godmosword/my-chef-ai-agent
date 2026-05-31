import { describe, expect, it } from "vitest";
import {
  ensureStoredSteps,
  parseStoredStep,
  StoredStepSchema,
} from "./stored-step";

describe("StoredStepSchema", () => {
  it("accepts object step with image fields", () => {
    const parsed = StoredStepSchema.safeParse({
      text: "切菜",
      image_status: "pending",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("parseStoredStep", () => {
  it("normalizes string step from StepSchema", () => {
    const step = parseStoredStep("打蛋");
    expect(step?.text).toBe("打蛋");
    expect(step?.image_status).toBe("pending");
  });

  it("accepts StepSchema object shape", () => {
    const step = parseStoredStep({ text: "下鍋", timer_seconds: 120 });
    expect(step?.text).toBe("下鍋");
    expect(step?.timer_seconds).toBe(120);
  });
});

describe("ensureStoredSteps", () => {
  it("maps mixed string and object steps", () => {
    const steps = ensureStoredSteps(["a", { text: "b", image_url: "https://x" }]);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.text).toBe("a");
    expect(steps[1]?.image_status).toBe("ready");
  });
});
