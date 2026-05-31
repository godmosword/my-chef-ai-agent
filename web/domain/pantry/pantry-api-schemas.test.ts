import { describe, expect, it } from "vitest";
import {
  AddPantryItemSchema,
  BulkAddPantrySchema,
  PantryConsumeSchema,
  UpdatePantryItemSchema,
} from "./pantry-api-schemas";

describe("UpdatePantryItemSchema", () => {
  it("rejects unknown keys", () => {
    const parsed = UpdatePantryItemSchema.safeParse({
      raw_name: "高麗菜",
      hacker: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts partial patch", () => {
    const parsed = UpdatePantryItemSchema.safeParse({ category: "vegetable" });
    expect(parsed.success).toBe(true);
  });
});

describe("AddPantryItemSchema", () => {
  it("requires raw_name", () => {
    expect(AddPantryItemSchema.safeParse({}).success).toBe(false);
    expect(
      AddPantryItemSchema.safeParse({ raw_name: "豆腐" }).success,
    ).toBe(true);
  });
});

describe("BulkAddPantrySchema", () => {
  it("requires at least one item", () => {
    expect(BulkAddPantrySchema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe("PantryConsumeSchema", () => {
  it("accepts full consume", () => {
    expect(PantryConsumeSchema.safeParse({ full: true }).success).toBe(true);
  });

  it("requires amount when not full", () => {
    expect(PantryConsumeSchema.safeParse({}).success).toBe(false);
    expect(PantryConsumeSchema.safeParse({ amount: 2 }).success).toBe(true);
  });
});
