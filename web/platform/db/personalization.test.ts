import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  addAllergy,
  addDislike,
  addHouseholdMember,
  addLovedDish,
  computeConfidenceScore,
  deleteAllPersonalization,
  deleteHouseholdMember,
  getTasteProfile,
  listHouseholdMembers,
  updateHouseholdMember,
  upsertTasteProfile,
} from "./personalization";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());
const tenantId = "default";
const userPrefix = `pm1-test-${Date.now()}`;

function testUser(suffix: string): string {
  return `${userPrefix}-${suffix}`;
}

describe("computeConfidenceScore", () => {
  it("returns 0 for empty profile without household", () => {
    const score = computeConfidenceScore(
      {
        spice_tolerance: null,
        sweetness_preference: null,
        saltiness_preference: null,
        allergies: [],
        dislikes: [],
        preferred_cuisines: [],
        cooking_skill_level: null,
        typical_cooking_time_min: null,
      },
      0,
    );
    expect(score).toBe(0);
  });

  it("returns partial score for some filled fields", () => {
    const score = computeConfidenceScore(
      {
        spice_tolerance: 2,
        sweetness_preference: null,
        saltiness_preference: null,
        allergies: ["花生"],
        dislikes: [],
        preferred_cuisines: [],
        cooking_skill_level: null,
        typical_cooking_time_min: null,
      },
      0,
    );
    expect(score).toBeCloseTo(2 / 9, 5);
  });

  it("returns 1.0 when all nine factors are filled", () => {
    const score = computeConfidenceScore(
      {
        spice_tolerance: 1,
        sweetness_preference: 2,
        saltiness_preference: 3,
        allergies: ["蝦"],
        dislikes: ["香菜"],
        preferred_cuisines: ["台式"],
        cooking_skill_level: 1,
        typical_cooking_time_min: 45,
      },
      1,
    );
    expect(score).toBe(1);
  });

  it("clamps above 1.0 defensively", () => {
    expect(computeConfidenceScore(
      {
        spice_tolerance: 1,
        sweetness_preference: 1,
        saltiness_preference: 1,
        allergies: ["a"],
        dislikes: ["b"],
        preferred_cuisines: ["c"],
        cooking_skill_level: 1,
        typical_cooking_time_min: 10,
      },
      99,
    )).toBe(1);
  });
});

describe("0010 personalization migration SQL", () => {
  it("is idempotent", () => {
    const sql = fs.readFileSync(
      path.join(__dirname, "../../migrations/0010_personalization.sql"),
      "utf-8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS user_taste_profile");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS household_members");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_household_members_tenant_user");
  });
});

describe.skipIf(!hasDb)("personalization integration", () => {
  const createdUsers: string[] = [];

  afterAll(async () => {
    for (const userId of createdUsers) {
      await deleteAllPersonalization(tenantId, userId);
    }
  });

  it("upsert_taste_profile insert → update → idempotent", async () => {
    const userId = testUser("upsert");
    createdUsers.push(userId);

    const inserted = await upsertTasteProfile(tenantId, userId, {
      spice_tolerance: 2,
      preferred_cuisines: ["日式"],
    });
    expect(inserted.spice_tolerance).toBe(2);
    expect(inserted.preferred_cuisines).toEqual(["日式"]);

    const updated = await upsertTasteProfile(tenantId, userId, {
      spice_tolerance: 3,
    });
    expect(updated.spice_tolerance).toBe(3);
    expect(updated.preferred_cuisines).toEqual(["日式"]);

    const again = await upsertTasteProfile(tenantId, userId, {});
    expect(again.spice_tolerance).toBe(3);
    expect(again.preferred_cuisines).toEqual(["日式"]);
  });

  it("add_loved_dish dedupes and caps at 50", async () => {
    const userId = testUser("loved");
    createdUsers.push(userId);

    await upsertTasteProfile(tenantId, userId, {});
    await addLovedDish(tenantId, userId, "番茄炒蛋", "台式");
    await addLovedDish(tenantId, userId, "番茄炒蛋", "家常");
    await addLovedDish(tenantId, userId, "麻婆豆腐", "川菜");

    let profile = await getTasteProfile(tenantId, userId);
    expect(profile?.loved_dishes).toHaveLength(2);
    expect(profile?.loved_dishes.map((d) => d.name)).toContain("麻婆豆腐");
    const tofu = profile?.loved_dishes.find((d) => d.name === "番茄炒蛋");
    expect(tofu?.cuisine).toBe("家常");

    for (let i = 0; i < 55; i += 1) {
      await addLovedDish(tenantId, userId, `菜色-${i}`, "測試");
    }
    profile = await getTasteProfile(tenantId, userId);
    expect(profile?.loved_dishes.length).toBe(50);
    expect(profile?.loved_dishes[0]?.name).toBe("菜色-5");
    expect(profile?.loved_dishes.at(-1)?.name).toBe("菜色-54");
  });

  it("add_household_member then list returns created_at order", async () => {
    const userId = testUser("household");
    createdUsers.push(userId);

    const first = await addHouseholdMember(tenantId, userId, {
      name: "小明",
      relation: "child",
    });
    await new Promise((r) => setTimeout(r, 5));
    const second = await addHouseholdMember(tenantId, userId, {
      name: "媽媽",
      relation: "parent",
    });

    const list = await listHouseholdMembers(tenantId, userId);
    expect(list.map((m) => m.id)).toEqual([first.id, second.id]);
    expect(list.map((m) => m.name)).toEqual(["小明", "媽媽"]);
  });

  it("update_household_member with wrong user_id returns null", async () => {
    const owner = testUser("owner");
    const other = testUser("other");
    createdUsers.push(owner, other);

    const member = await addHouseholdMember(tenantId, owner, { name: "家人" });
    const updated = await updateHouseholdMember(member.id, tenantId, other, {
      name: "駭客",
    });
    expect(updated).toBeNull();

    const list = await listHouseholdMembers(tenantId, owner);
    expect(list[0]?.name).toBe("家人");
  });

  it("delete_all_personalization wipes both tables", async () => {
    const userId = testUser("wipe");
    createdUsers.push(userId);

    await upsertTasteProfile(tenantId, userId, { dislikes: ["苦瓜"] });
    await addHouseholdMember(tenantId, userId, { name: "測試員" });
    await deleteAllPersonalization(tenantId, userId);

    expect(await getTasteProfile(tenantId, userId)).toBeNull();
    expect(await listHouseholdMembers(tenantId, userId)).toEqual([]);
  });

  it("recomputes confidence_score on partial vs full data", async () => {
    const userId = testUser("confidence");
    createdUsers.push(userId);

    const partial = await upsertTasteProfile(tenantId, userId, {
      spice_tolerance: 2,
      allergies: ["花生"],
    });
    expect(partial.confidence_score).toBeCloseTo(2 / 9, 5);

    await addHouseholdMember(tenantId, userId, { name: "我" });
    const full = await upsertTasteProfile(tenantId, userId, {
      sweetness_preference: 1,
      saltiness_preference: 2,
      dislikes: ["香菜"],
      preferred_cuisines: ["台式"],
      cooking_skill_level: 1,
      typical_cooking_time_min: 30,
    });
    expect(full.confidence_score).toBe(1);
  });

  it("stores Chinese characters in allergies and dislikes", async () => {
    const userId = testUser("cjk");
    createdUsers.push(userId);

    await upsertTasteProfile(tenantId, userId, {
      allergies: ["蝦仁", "花生醬"],
      dislikes: ["香菜", "苦瓜"],
    });
    await addDislike(tenantId, userId, "芹菜");
    await addAllergy(tenantId, userId, "蝦仁");

    const profile = await getTasteProfile(tenantId, userId);
    expect(profile?.allergies).toEqual(["蝦仁", "花生醬"]);
    expect(profile?.dislikes).toEqual(["香菜", "苦瓜", "芹菜"]);
  });

  it("delete_household_member returns true when deleted", async () => {
    const userId = testUser("del-member");
    createdUsers.push(userId);

    const member = await addHouseholdMember(tenantId, userId, { name: "暫存" });
    const ok = await deleteHouseholdMember(member.id, tenantId, userId);
    expect(ok).toBe(true);
    expect(await listHouseholdMembers(tenantId, userId)).toHaveLength(0);
  });
});
