import { asRows, getSql, isDatabaseConfigured } from "./client";

export type MemoryMessage = {
  role: string;
  content: string;
  timestamp?: string;
};

export async function getUserMemory(
  userId: string,
  tenantId: string,
): Promise<MemoryMessage[]> {
  const sql = getSql();
  if (!sql) return [];

  const rows = await sql`
    SELECT history FROM user_memory
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<{ history: unknown }>(rows)[0];
  if (!row?.history) return [];
  const h = row.history;
  if (typeof h === "string") {
    try {
      return JSON.parse(h) as MemoryMessage[];
    } catch {
      return [];
    }
  }
  return Array.isArray(h) ? (h as MemoryMessage[]) : [];
}

export async function saveUserMemory(
  userId: string,
  tenantId: string,
  history: MemoryMessage[],
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  const payload = JSON.stringify(history);
  await sql`
    INSERT INTO user_memory (tenant_id, user_id, history)
    VALUES (${tenantId}, ${userId}, ${payload}::jsonb)
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      history = EXCLUDED.history,
      updated_at = now()
  `;
}

export async function clearUserMemory(
  userId: string,
  tenantId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await sql`
    DELETE FROM user_memory
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}

export function memoryAvailable(): boolean {
  return isDatabaseConfigured();
}
