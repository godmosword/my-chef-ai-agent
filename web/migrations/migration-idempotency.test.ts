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
