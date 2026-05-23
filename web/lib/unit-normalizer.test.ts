import { describe, expect, it } from "vitest";
import {
  formatAmount,
  mergeParsedItems,
  normalizeName,
  parseAmountUnit,
} from "@chef/shared-types";

describe("normalizeName", () => {
  it("strips parens and whitespace", () => {
    expect(normalizeName("番茄 (去皮)")).toBe("番茄");
    expect(normalizeName("  雞胸肉 ")).toBe("雞胸肉");
  });

  it("does not merge 鹽 and 胡椒鹽", () => {
    expect(normalizeName("鹽")).not.toBe(normalizeName("胡椒鹽"));
  });
});

describe("parseAmountUnit", () => {
  it("parses grams", () => {
    const p = parseAmountUnit("300", "g");
    expect(p?.kind).toBe("numeric");
    if (p?.kind === "numeric") {
      expect(p.value).toBe(300);
      expect(p.unit).toBe("g");
    }
  });

  it("parses fuzzy", () => {
    expect(parseAmountUnit("適量")?.kind).toBe("fuzzy");
  });
});

describe("formatAmount", () => {
  it("upgrades g to kg at 1000", () => {
    expect(formatAmount(1000, "g")).toBe("1.0kg");
    expect(formatAmount(999, "g")).toBe("999g");
    expect(formatAmount(1001, "g")).toBe("1.0kg");
  });

  it("upgrades ml to L", () => {
    expect(formatAmount(1200, "ml")).toBe("1.2L");
  });
});

describe("mergeParsedItems", () => {
  it("sums same name same g", () => {
    const m = mergeParsedItems([
      {
        name: "雞胸肉",
        normalizedName: "雞胸肉",
        parsed: { kind: "numeric", value: 300, unit: "g", family: "weight" },
      },
      {
        name: "雞胸肉",
        normalizedName: "雞胸肉",
        parsed: { kind: "numeric", value: 300, unit: "g", family: "weight" },
      },
    ]);
    expect(m.amount).toBe(600);
    expect(m.unit).toBe("g");
  });

  it("converts 500g + 1kg to 1.5kg display via formatAmount path", () => {
    const m = mergeParsedItems([
      {
        name: "豬肉",
        normalizedName: "豬肉",
        parsed: { kind: "numeric", value: 500, unit: "g", family: "weight" },
      },
      {
        name: "豬肉",
        normalizedName: "豬肉",
        parsed: { kind: "numeric", value: 1000, unit: "g", family: "weight" },
      },
    ]);
    expect(m.amount).toBe(1500);
    expect(m.unit).toBe("g");
  });

  it("fuzzy + teaspoon becomes 適量", () => {
    const m = mergeParsedItems([
      {
        name: "鹽",
        normalizedName: "鹽",
        parsed: { kind: "numeric", value: 5, unit: "ml", family: "volume" },
      },
      {
        name: "鹽",
        normalizedName: "鹽",
        parsed: { kind: "fuzzy", display: "適量" },
      },
    ]);
    expect(m.amount).toBe("適量");
  });

  it("countable different units stay separate", () => {
    const m = mergeParsedItems([
      {
        name: "蒜頭",
        normalizedName: "蒜頭",
        parsed: { kind: "countable", value: 3, unit: "瓣" },
      },
      {
        name: "蒜頭",
        normalizedName: "蒜頭",
        parsed: { kind: "countable", value: 1, unit: "顆" },
      },
    ]);
    expect(String(m.amount)).toContain("+");
  });

  it("same countable unit sums", () => {
    const m = mergeParsedItems([
      {
        name: "番茄",
        normalizedName: "番茄",
        parsed: { kind: "countable", value: 2, unit: "顆" },
      },
      {
        name: "番茄",
        normalizedName: "番茄",
        parsed: { kind: "countable", value: 1, unit: "顆" },
      },
    ]);
    expect(m.amount).toBe(3);
    expect(m.unit).toBe("顆");
  });
});
