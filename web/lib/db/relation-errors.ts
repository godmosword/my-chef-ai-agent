/** Detect Postgres missing-relation errors (42P01). */
export function isMissingRelationError(err: unknown, tableName?: string): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: string }).code) : "";
  const message = err instanceof Error ? err.message : String(err);
  if (code !== "42P01" && !message.includes("does not exist")) return false;
  if (!tableName) return true;
  return message.includes(`"${tableName}"`) || message.includes(`'${tableName}'`);
}
