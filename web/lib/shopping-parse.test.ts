import { describe, expect, it } from "vitest";
import { parseShoppingList, parseShoppingListItem } from "@chef/shared-types";

describe("parseShoppingListItem", () => {
  it("parses string line with glued unit", () => {
    const row = parseShoppingListItem("雞胸肉 300g");
    expect(row?.name).toBe("雞胸肉");
    expect(row?.parsed?.kind).toBe("numeric");
  });

  it("parses section prefix", () => {
    const row = parseShoppingListItem("蔬菜：番茄 3 顆");
    expect(row?.name).toBe("番茄");
    expect(row?.category).toBe("produce");
  });

  it("parses object item", () => {
    const row = parseShoppingListItem({
      name: "牛奶",
      amount: "200",
      unit: "ml",
      category: "dairy",
    });
    expect(row?.name).toBe("牛奶");
    expect(row?.category).toBe("dairy");
  });
});

describe("parseShoppingList scaling", () => {
  it("scales numeric amounts by servings", () => {
    const rows = parseShoppingList(
      [{ name: "雞胸肉", amount: "100", unit: "g" }],
      4,
    );
    expect(rows[0].parsed?.kind).toBe("numeric");
    if (rows[0].parsed?.kind === "numeric") {
      expect(rows[0].parsed.value).toBe(200);
    }
  });

  it("does not scale fuzzy", () => {
    const rows = parseShoppingList(["鹽 適量"], 4);
    expect(rows[0].amount).toBe("適量");
  });
});
