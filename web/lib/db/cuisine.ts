import { asRows, getSql } from "./client";

export async function getUserCuisineContext(
  userId: string,
  tenantId: string,
): Promise<{ active_cuisine: string | null; context_updated_at: string | null }> {
  const sql = getSql();
  if (!sql) return { active_cuisine: null, context_updated_at: null };

  const rows = await sql`
    SELECT active_cuisine, context_updated_at FROM user_cuisine_context
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<{
    active_cuisine?: string;
    context_updated_at?: Date | string;
  }>(rows)[0];
  if (!row) return { active_cuisine: null, context_updated_at: null };
  const ts = row.context_updated_at;
  return {
    active_cuisine: row.active_cuisine ?? null,
    context_updated_at:
      ts instanceof Date ? ts.toISOString() : ts ? String(ts) : null,
  };
}
