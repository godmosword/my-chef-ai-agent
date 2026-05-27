import { describe, expect, it } from "vitest";
import {
  convertToBase,
  normalizeIngredientName,
  normalizeQuantityAndUnit,
  unitsComparable,
} from "./pantry-normalization";

describe("normalizeIngredientName", () => {
  it("maps 番茄 to tomato", () => {
    expect(normalizeIngredientName("番茄")).toEqual([
      "tomato",
      "番茄",
      "vegetable",
    ]);
  });

  it("maps 蕃茄 same as 番茄", () => {
    expect(normalizeIngredientName("蕃茄")).toEqual(
      normalizeIngredientName("番茄"),
    );
  });

  it("maps 牛番茄 same as 番茄", () => {
    expect(normalizeIngredientName("牛番茄")).toEqual(
      normalizeIngredientName("番茄"),
    );
  });

  it("maps 小番茄 to cherry_tomato", () => {
    expect(normalizeIngredientName("小番茄")).toEqual([
      "cherry_tomato",
      "小番茄",
      "vegetable",
    ]);
  });

  it("maps 葱 to scallion (簡→繁)", () => {
    expect(normalizeIngredientName("葱")).toEqual([
      "scallion",
      "蔥",
      "vegetable",
    ]);
  });

  it("unknown ingredient uses stable custom key", () => {
    const a = normalizeIngredientName("某種奇怪食材");
    expect(a[2]).toBe("other");
    expect(a[1]).toBe("某種奇怪食材");
    expect(a[0]).toMatch(/^custom_[0-9a-f]{8}_/);
  });

  it("unknown ingredient is deterministic", () => {
    const a = normalizeIngredientName("某種奇怪食材");
    const b = normalizeIngredientName("某種奇怪食材");
    expect(a[0]).toBe(b[0]);
  });
});

describe("normalizeQuantityAndUnit", () => {
  it("parses 500 克", () => {
    expect(normalizeQuantityAndUnit("500", "克")).toEqual([
      500,
      "g",
      "500 克",
    ]);
  });

  it("converts 1 公斤 to grams", () => {
    expect(normalizeQuantityAndUnit("1", "公斤")).toEqual([
      1000,
      "g",
      "1 公斤",
    ]);
  });

  it("parses 半斤", () => {
    expect(normalizeQuantityAndUnit("半", "斤")).toEqual([300, "g", "半斤"]);
  });

  it("parses 一把", () => {
    expect(normalizeQuantityAndUnit("一", "把")).toEqual([1, "bunch", "一把"]);
  });

  it("parses 適量", () => {
    expect(normalizeQuantityAndUnit("適量", null)).toEqual([
      null,
      "some",
      "適量",
    ]);
  });

  it("returns null units for garbage input", () => {
    expect(
      normalizeQuantityAndUnit("亂七八糟的東西", "莫名其妙單位"),
    ).toEqual([null, null, "亂七八糟的東西 莫名其妙單位"]);
  });

  it("parses ½ 杯", () => {
    expect(normalizeQuantityAndUnit("½", "杯")).toEqual([0.5, "cup", "½ 杯"]);
  });
});

describe("unitsComparable", () => {
  it("g and kg are comparable", () => {
    expect(unitsComparable("g", "kg")).toBe(true);
  });

  it("g and ml are not comparable", () => {
    expect(unitsComparable("g", "ml")).toBe(false);
  });

  it("piece and head are both count", () => {
    expect(unitsComparable("piece", "head")).toBe(true);
  });
});

describe("convertToBase", () => {
  it("converts kg to g", () => {
    expect(convertToBase(2, "kg")).toEqual({ quantity: 2000, unit: "g" });
  });

  it("converts l to ml", () => {
    expect(convertToBase(1, "l")).toEqual({ quantity: 1000, unit: "ml" });
  });

  it("keeps piece count", () => {
    expect(convertToBase(5, "piece")).toEqual({ quantity: 5, unit: "piece" });
  });
});
