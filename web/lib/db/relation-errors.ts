/** Detect Postgres missing-column errors (42703) for recipe_versions stats (migration 0009). */
export function isMissingRecipeVersionStatsColumns(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  if (code === "42703") return true;
  return /column "(prep_minutes|cook_minutes|servings)"/i.test(message);
}

/** Detect Postgres missing-relation errors (42P01). */
export function isMissingRelationError(err: unknown, tableName?: string): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: string }).code) : "";
  const message = err instanceof Error ? err.message : String(err);
  if (code !== "42P01" && !message.includes("does not exist")) return false;
  if (!tableName) return true;
  return message.includes(`"${tableName}"`) || message.includes(`'${tableName}'`);
}
