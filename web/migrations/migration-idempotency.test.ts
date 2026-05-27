import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = path.join(__dirname);

describe("recipe library migration SQL", () => {
  it("0001 creates usage_daily before 0003 alters it", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0001_web_phase1_baseline.sql"),
      "utf-8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS usage_daily");
  });

  it("0008 ensures user_settings idempotently", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0008_ensure_user_settings_and_sharing.sql"),
      "utf-8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS user_settings");
    expect(sql).toContain("hero_auto_generate");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS meal_plans");
  });

  it("0012 adds onboarding_status idempotently", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0012_onboarding_status.sql"),
      "utf-8",
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS onboarding_status");
  });

  it("0011 adds regenerated_dishes idempotently", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0011_regenerated_dishes.sql"),
      "utf-8",
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS regenerated_dishes");
  });

  it("0014 ensures pantry vision sessions idempotently", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0014_pantry_vision.sql"),
      "utf-8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS pantry_vision_sessions");
    expect(sql).toContain("pantry_vision_count");
  });

  it("0013 ensures pantry_items idempotently", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0013_pantry_items.sql"),
      "utf-8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS pantry_items");
    expect(sql).toContain("idx_pantry_items_tenant_user_deleted");
  });

  it("0010 ensures personalization tables idempotently", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0010_personalization.sql"),
      "utf-8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS user_taste_profile");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS household_members");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_household_members_tenant_user");
  });

  it("0003 is idempotent-friendly", () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, "0003_recipe_library.sql"),
      "utf-8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS recipes");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS text_requests_count");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS image_requests_count");
    expect(sql).not.toContain("CREATE TABLE quotas");
  });
});
