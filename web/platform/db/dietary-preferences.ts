import {
  type DietaryPreferences,
  normalizeDietaryPreferences,
} from "@/domain/settings/dietary-preferences";
import { asRows, getSql } from "./client";

export {
  DIETARY_PRESET_OPTIONS,
  dietaryPreferencesPromptText,
  normalizeDietaryPreferences,
  type DietaryPresetKey,
  type DietaryPreferences,
} from "@/domain/settings/dietary-preferences";

const EMPTY: DietaryPreferences = { tags: [], avoid_custom: "" };

export async function getDietaryPreferences(
  userId: string,
  tenantId: string,
): Promise<DietaryPreferences> {
  const sql = getSql();
  if (!sql) return EMPTY;

  const rows = await sql`
    SELECT preferences FROM user_preferences
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  const row = asRows<{ preferences?: unknown }>(rows)[0];
  if (!row?.preferences) return EMPTY;
  return normalizeDietaryPreferences(row.preferences);
}

export async function saveDietaryPreferences(
  userId: string,
  tenantId: string,
  prefs: DietaryPreferences,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  const normalized = normalizeDietaryPreferences(prefs);

  await sql`
    INSERT INTO user_preferences (tenant_id, user_id, preferences, updated_at)
    VALUES (${tenantId}, ${userId}, ${JSON.stringify(normalized)}::jsonb, now())
    ON CONFLICT (tenant_id, user_id)
    DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = now()
  `;
}
