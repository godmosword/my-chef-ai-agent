import { describe, expect, it } from "vitest";
import { getLocalParts, isInQuietHours } from "./quiet-hours";

describe("quiet hours", () => {
  it("wrap-around 22→8", () => {
    expect(isInQuietHours(22, 22, 8)).toBe(true);
    expect(isInQuietHours(23, 22, 8)).toBe(true);
    expect(isInQuietHours(7, 22, 8)).toBe(true);
    expect(isInQuietHours(8, 22, 8)).toBe(false);
    expect(isInQuietHours(9, 22, 8)).toBe(false);
  });

  it("Taipei timezone parts", () => {
    const parts = getLocalParts(
      new Date("2026-05-27T01:00:00Z"),
      "Asia/Taipei",
    );
    expect(parts.hour).toBe(9);
  });
});
