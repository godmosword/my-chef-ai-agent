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

export async function updateUserCuisineContext(
  userId: string,
  tenantId: string,
  activeCuisine: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  const ts = new Date().toISOString();
  await sql`
    INSERT INTO user_cuisine_context (tenant_id, user_id, active_cuisine, context_updated_at)
    VALUES (${tenantId}, ${userId}, ${activeCuisine}, ${ts})
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      active_cuisine = EXCLUDED.active_cuisine,
      context_updated_at = EXCLUDED.context_updated_at
  `;
}
