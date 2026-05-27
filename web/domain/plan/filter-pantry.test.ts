import { describe, expect, it } from "vitest";
import type { AggregatedShoppingItem } from "@chef/shared-types";
import { filterShoppingGroupsByPantry, shoppingItemAtHome } from "./filter-pantry";

const item = (name: string): AggregatedShoppingItem => ({
  name,
  amount: 1,
  category: "produce",
  sources: [],
});

describe("filter-pantry", () => {
  it("marks at-home items", () => {
    expect(shoppingItemAtHome(item("番茄"), ["番茄"])).toBe(true);
    expect(shoppingItemAtHome(item("牛肉"), ["番茄"])).toBe(false);
  });

  it("filters groups", () => {
    const groups = {
      produce: [item("番茄"), item("高麗菜")],
    };
    const next = filterShoppingGroupsByPantry(groups, ["番茄"]);
    expect(next.produce?.map((i) => i.name)).toEqual(["高麗菜"]);
  });
});
