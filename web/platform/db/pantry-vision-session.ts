import { randomUUID } from "node:crypto";
import type { PantryReviewSessionPayload } from "@/domain/pantry/vision/review-types";
import { pantryReviewTtlSec } from "@/platform/config/pantry-vision-config";
import { asRows, getSql } from "./client";

export async function createPantryReviewSession(
  tenantId: string,
  userId: string,
  sessionType: "fridge" | "receipt",
  payload: Omit<PantryReviewSessionPayload, "kind" | "created_at" | "user_edits_count">,
): Promise<string> {
  const sql = getSql();
  if (!sql) throw new Error("Database not configured");
  const id = randomUUID();
  const ttlSec = pantryReviewTtlSec();
  const full: PantryReviewSessionPayload = {
    kind: "pantry_review",
    user_edits_count: 0,
    created_at: new Date().toISOString(),
    ...payload,
    type: sessionType,
  };
  await sql`
    INSERT INTO pantry_vision_sessions (id, tenant_id, user_id, session_type, payload, expires_at)
    VALUES (
      ${id}, ${tenantId}, ${userId}, ${sessionType},
      ${JSON.stringify(full)}::jsonb,
      now() + (${ttlSec}::int * interval '1 second')
    )
  `;
  return id;
}

export async function getPantryReviewSession(
  sessionId: string,
  tenantId: string,
  userId: string,
): Promise<PantryReviewSessionPayload | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT payload, expires_at FROM pantry_vision_sessions
    WHERE id = ${sessionId}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND expires_at > now()
  `;
  const row = asRows<{ payload: PantryReviewSessionPayload }>(rows)[0];
  if (!row?.payload) return null;
  return row.payload;
}

export async function savePantryReviewSession(
  sessionId: string,
  tenantId: string,
  userId: string,
  payload: PantryReviewSessionPayload,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`
    UPDATE pantry_vision_sessions SET payload = ${JSON.stringify(payload)}::jsonb
    WHERE id = ${sessionId}
      AND tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND expires_at > now()
    RETURNING id
  `;
  return asRows(rows).length > 0;
}

export async function deletePantryReviewSession(
  sessionId: string,
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    DELETE FROM pantry_vision_sessions
    WHERE id = ${sessionId} AND tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}
