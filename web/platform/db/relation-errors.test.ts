import { describe, expect, it } from "vitest";
import { isMissingRecipeVersionStatsColumns } from "./relation-errors";

describe("isMissingRecipeVersionStatsColumns", () => {
  it("detects Postgres 42703", () => {
    expect(
      isMissingRecipeVersionStatsColumns({ code: "42703", message: "undefined_column" }),
    ).toBe(true);
  });

  it("detects column does not exist message", () => {
    expect(
      isMissingRecipeVersionStatsColumns(
        new Error('column "prep_minutes" of relation "recipe_versions" does not exist'),
      ),
    ).toBe(true);
  });

  it("ignores generic Failed query logs", () => {
    expect(
      isMissingRecipeVersionStatsColumns(
        new Error('Failed query: insert into "recipe_versions" (prep_minutes)'),
      ),
    ).toBe(false);
  });
});
