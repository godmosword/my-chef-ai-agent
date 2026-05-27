import { describe, expect, it } from "vitest";
import {
  isPantryMatch,
  normalizePantryName,
  sanitizeTonightPantry,
} from "./tonight";

describe("sanitizeTonightPantry", () => {
  it("caps at 5 and dedupes", () => {
    const items = ["番茄", " 番茄 ", "雞蛋", "a", "b", "c", "d", "e"];
    expect(sanitizeTonightPantry(items)).toEqual(["番茄", "雞蛋", "a", "b", "c"]);
  });
});

describe("isPantryMatch", () => {
  it("matches substring names", () => {
    const keys = new Set([normalizePantryName("雞胸")]);
    expect(isPantryMatch("雞胸肉", keys)).toBe(true);
  });
});
