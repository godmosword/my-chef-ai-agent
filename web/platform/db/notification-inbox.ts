/**
 * In-app notification inbox (PT-4) — Web delivery instead of LINE push.
 */
import { asRows, getSql } from "./client";

export type NotificationInboxKind =
  | "expiry_reminder"
  | "weekly_digest"
  | "expiry_disclaimer";

export type NotificationInboxRow = {
  id: number;
  tenant_id: string;
  user_id: string;
  kind: NotificationInboxKind;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

function rowToInbox(row: Record<string, unknown>): NotificationInboxRow {
  return {
    id: Number(row.id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    kind: String(row.kind) as NotificationInboxKind,
    payload:
      typeof row.payload === "object" && row.payload != null
        ? (row.payload as Record<string, unknown>)
        : {},
    read_at:
      row.read_at instanceof Date
        ? row.read_at.toISOString()
        : row.read_at == null
          ? null
          : String(row.read_at),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

export async function insertNotificationInbox(
  tenantId: string,
  userId: string,
  kind: NotificationInboxKind,
  payload: Record<string, unknown>,
): Promise<NotificationInboxRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO notification_inbox (tenant_id, user_id, kind, payload)
    VALUES (${tenantId}, ${userId}, ${kind}, ${JSON.stringify(payload)}::jsonb)
    RETURNING *
  `;
  const row = asRows<Record<string, unknown>>(rows)[0];
  return row ? rowToInbox(row) : null;
}

export async function listUnreadNotifications(
  tenantId: string,
  userId: string,
  limit = 10,
): Promise<NotificationInboxRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM notification_inbox
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND read_at IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return asRows<Record<string, unknown>>(rows).map(rowToInbox);
}

export async function markNotificationRead(
  id: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`
    UPDATE notification_inbox
    SET read_at = now()
    WHERE id = ${id}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
    RETURNING id
  `;
  return asRows(rows).length > 0;
}

export async function hardDeleteNotificationInbox(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    DELETE FROM notification_inbox
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}
