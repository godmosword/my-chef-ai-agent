import { asRows, getSql } from "./client";

export async function getUserPreferences(
  userId: string,
  tenantId: string,
): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;

  const rows = await sql`
    SELECT preferences FROM user_preferences
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<{ preferences?: unknown }>(rows)[0];
  if (!row?.preferences) return null;
  const prefs = row.preferences;
  if (Array.isArray(prefs)) {
    return prefs.length ? prefs.map(String).join("、") : null;
  }
  const s = String(prefs).trim();
  return s || null;
}
