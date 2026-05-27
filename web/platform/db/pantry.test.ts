import { afterAll, describe, expect, it } from "vitest";
import {
  addPantryItem,
  bulkAddPantryItems,
  consumePantryItem,
  deletePantryItem,
  findByItemKey,
  findExpiringSoon,
  getPantryItem,
  hardDeleteAllPantry,
  listPantryItems,
  updatePantryItem,
} from "./pantry";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());
const tenantId = "default";
const userPrefix = `pt1-test-${Date.now()}`;

function testUser(suffix: string): string {
  return `${userPrefix}-${suffix}`;
}

describe.skipIf(!hasDb)("pantry CRUD", () => {
  const userId = testUser("main");

  afterAll(async () => {
    await hardDeleteAllPantry(tenantId, userId);
  });

  it("add_pantry_item normalizes raw inputs", async () => {
    const row = await addPantryItem(tenantId, userId, {
      raw_name: "番茄",
      raw_quantity: "500",
      raw_unit: "克",
      merge_strategy: "never_merge",
    });
    expect(row.item_key).toBe("tomato");
    expect(row.quantity).toBe(500);
    expect(row.unit).toBe("g");
  });

  it("merges same expiry NULL quantities", async () => {
    const u = testUser("merge-null");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      raw_quantity: "500",
      raw_unit: "克",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "蕃茄",
      raw_quantity: "300",
      raw_unit: "克",
    });
    const items = await listPantryItems(tenantId, u);
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(800);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("merge_if_same_expiry keeps different expiry rows", async () => {
    const u = testUser("merge-exp");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      raw_quantity: 1,
      raw_unit: "個",
      expires_at: "2026-06-01",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      raw_quantity: 1,
      raw_unit: "個",
      expires_at: "2026-06-05",
    });
    expect((await listPantryItems(tenantId, u)).length).toBe(2);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("always_merge sums across expiries", async () => {
    const u = testUser("merge-always");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      raw_quantity: "200",
      raw_unit: "克",
      expires_at: "2026-06-01",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      raw_quantity: "100",
      raw_unit: "克",
      expires_at: "2026-06-10",
      merge_strategy: "always_merge",
    });
    const items = await listPantryItems(tenantId, u);
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(300);
    expect(items[0]!.expires_at).toBe("2026-06-10");
    await hardDeleteAllPantry(tenantId, u);
  });

  it("never_merge creates separate rows", async () => {
    const u = testUser("never");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      raw_quantity: 1,
      raw_unit: "個",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      raw_quantity: 1,
      raw_unit: "個",
      merge_strategy: "never_merge",
    });
    expect((await listPantryItems(tenantId, u)).length).toBe(2);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("bulk_add_pantry_items processes multiple items", async () => {
    const u = testUser("bulk");
    await hardDeleteAllPantry(tenantId, u);
    const rows = await bulkAddPantryItems(tenantId, u, [
      { raw_name: "雞蛋", raw_quantity: 3, raw_unit: "個" },
      { raw_name: "牛奶", raw_quantity: 1, raw_unit: "瓶" },
      { raw_name: "醬油" },
    ]);
    expect(rows.length).toBe(3);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("list_pantry_items sorts by expiry then created", async () => {
    const u = testUser("sort");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "豆腐",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "牛奶",
      expires_at: "2026-01-01",
      merge_strategy: "never_merge",
    });
    const items = await listPantryItems(tenantId, u);
    expect(items[0]!.expires_at).toBe("2026-01-01");
    expect(items[items.length - 1]!.expires_at).toBeNull();
    await hardDeleteAllPantry(tenantId, u);
  });

  it("list_pantry_items filters by location", async () => {
    const u = testUser("loc");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "米",
      location: "pantry",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "蛋",
      location: "fridge_main",
      merge_strategy: "never_merge",
    });
    expect(
      (await listPantryItems(tenantId, u, { location: "pantry" })).length,
    ).toBe(1);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("consume partial amount", async () => {
    const u = testUser("consume-p");
    await hardDeleteAllPantry(tenantId, u);
    const row = await addPantryItem(tenantId, u, {
      raw_name: "豬肉",
      raw_quantity: 500,
      raw_unit: "克",
      merge_strategy: "never_merge",
    });
    const after = await consumePantryItem(row.id, tenantId, u, {
      amount: 200,
      unit: "g",
    });
    expect(after!.quantity).toBe(300);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("consume over amount soft deletes", async () => {
    const u = testUser("consume-f");
    await hardDeleteAllPantry(tenantId, u);
    const row = await addPantryItem(tenantId, u, {
      raw_name: "豆腐",
      raw_quantity: 100,
      raw_unit: "克",
      merge_strategy: "never_merge",
    });
    const after = await consumePantryItem(row.id, tenantId, u, {
      amount: 500,
      unit: "g",
    });
    expect(after!.quantity).toBe(0);
    expect(await getPantryItem(row.id, tenantId, u)).toBeNull();
    await hardDeleteAllPantry(tenantId, u);
  });

  it("consume with kg conversion", async () => {
    const u = testUser("consume-u");
    await hardDeleteAllPantry(tenantId, u);
    const row = await addPantryItem(tenantId, u, {
      raw_name: "麵粉",
      raw_quantity: 1000,
      raw_unit: "克",
      merge_strategy: "never_merge",
    });
    const after = await consumePantryItem(row.id, tenantId, u, {
      amount: 0.2,
      unit: "kg",
    });
    expect(after!.quantity).toBe(800);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("consume throws on incompatible units", async () => {
    const u = testUser("consume-bad");
    await hardDeleteAllPantry(tenantId, u);
    const row = await addPantryItem(tenantId, u, {
      raw_name: "高麗菜",
      raw_quantity: 500,
      raw_unit: "克",
      merge_strategy: "never_merge",
    });
    await expect(
      consumePantryItem(row.id, tenantId, u, { amount: 1, unit: "把" }),
    ).rejects.toThrow(/incompatible/i);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("find_expiring_soon includes expired and soon, not null", async () => {
    const u = testUser("exp");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "鮮奶",
      expires_at: "2020-01-01",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "優格",
      expires_at: "2099-12-31",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "米",
      merge_strategy: "never_merge",
    });
    const soon = await findExpiringSoon(tenantId, u, { days_ahead: 3 });
    const keys = soon.map((s) => s.item_key);
    expect(keys).toContain("milk");
    expect(keys).not.toContain("rice");
    expect(soon.every((s) => s.expires_at != null)).toBe(true);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("find_by_item_key groups results", async () => {
    const u = testUser("keys");
    await hardDeleteAllPantry(tenantId, u);
    await addPantryItem(tenantId, u, {
      raw_name: "番茄",
      merge_strategy: "never_merge",
    });
    await addPantryItem(tenantId, u, {
      raw_name: "雞蛋",
      merge_strategy: "never_merge",
    });
    const map = await findByItemKey(tenantId, u, ["tomato", "egg", "missing"]);
    expect(map.tomato?.length).toBe(1);
    expect(map.egg?.length).toBe(1);
    expect(map.missing?.length).toBe(0);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("tenant isolation on read", async () => {
    const u1 = testUser("iso1");
    const u2 = testUser("iso2");
    await hardDeleteAllPantry(tenantId, u1);
    await hardDeleteAllPantry(tenantId, u2);
    const row = await addPantryItem(tenantId, u1, {
      raw_name: "鹽",
      merge_strategy: "never_merge",
    });
    expect(await getPantryItem(row.id, tenantId, u2)).toBeNull();
    await hardDeleteAllPantry(tenantId, u1);
    await hardDeleteAllPantry(tenantId, u2);
  });

  it("hard_delete_all_pantry removes all rows", async () => {
    const u = testUser("hard");
    await addPantryItem(tenantId, u, {
      raw_name: "糖",
      merge_strategy: "never_merge",
    });
    const n = await hardDeleteAllPantry(tenantId, u);
    expect(n).toBeGreaterThanOrEqual(1);
    expect((await listPantryItems(tenantId, u)).length).toBe(0);
  });

  it("soft-deleted items hidden from list", async () => {
    const u = testUser("soft");
    await hardDeleteAllPantry(tenantId, u);
    const row = await addPantryItem(tenantId, u, {
      raw_name: "醋",
      merge_strategy: "never_merge",
    });
    await deletePantryItem(row.id, tenantId, u);
    expect((await listPantryItems(tenantId, u)).length).toBe(0);
    await hardDeleteAllPantry(tenantId, u);
  });

  it("update re-normalizes raw_name", async () => {
    const u = testUser("upd");
    await hardDeleteAllPantry(tenantId, u);
    const row = await addPantryItem(tenantId, u, {
      raw_name: "蕃茄",
      merge_strategy: "never_merge",
    });
    const updated = await updatePantryItem(row.id, tenantId, u, {
      raw_name: "小番茄",
    });
    expect(updated!.item_key).toBe("cherry_tomato");
    await hardDeleteAllPantry(tenantId, u);
  });
});
