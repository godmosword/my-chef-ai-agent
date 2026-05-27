import { describe, expect, it } from "vitest";
import { endAtFromRemaining, remainingMsFromEndAt } from "./timerMath";

describe("timerMath", () => {
  it("remaining decreases with time", () => {
    const endAt = endAtFromRemaining(5000, 1000);
    expect(remainingMsFromEndAt(endAt, 2000)).toBe(4000);
    expect(remainingMsFromEndAt(endAt, 6000)).toBe(0);
  });

  it("tab background: absolute endAt still correct after gap", () => {
    const endAt = endAtFromRemaining(60_000, 0);
    expect(remainingMsFromEndAt(endAt, 45_000)).toBe(15_000);
  });
});
