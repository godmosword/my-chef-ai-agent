import { eq } from "drizzle-orm";
import type { UpdateUserSettings, UserSettings } from "@chef/shared-types";
import { isMissingRelationError } from "@/platform/db/relation-errors";
import { getDb } from "../drizzle";
import { userSettings } from "../schema";

const DEFAULTS: UserSettings = {
  theme: "system",
  font_scale: 100,
  locale: "zh-Hant-TW",
  voice_enabled: false,
  analytics_opt: true,
  hero_auto_generate: true,
};

export async function getUserSettings(
  userId: string,
  _tenantId: string,
): Promise<UserSettings> {
  const db = getDb();
  if (!db) return DEFAULTS;

  try {
    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!row) return DEFAULTS;

    return {
      theme: (row.theme as UserSettings["theme"]) ?? "system",
      font_scale: row.fontScale ?? 100,
      locale: row.locale ?? DEFAULTS.locale,
      voice_enabled: row.voiceEnabled ?? false,
      analytics_opt: row.analyticsOpt ?? true,
      hero_auto_generate: row.heroAutoGenerate ?? true,
    };
  } catch (err) {
    if (isMissingRelationError(err, "user_settings")) {
      console.warn(
        "[settings] user_settings table missing; run pnpm -F @chef/web db:migrate (0005 or 0008)",
      );
      return DEFAULTS;
    }
    throw err;
  }
}

export async function upsertUserSettings(
  userId: string,
  tenantId: string,
  patch: UpdateUserSettings,
): Promise<UserSettings> {
  const db = getDb();
  if (!db) return { ...DEFAULTS, ...patch };

  const current = await getUserSettings(userId, tenantId);
  const next: UserSettings = { ...current, ...patch };

  try {
    await db
      .insert(userSettings)
      .values({
        userId,
        tenantId,
        theme: next.theme,
        fontScale: next.font_scale,
        locale: next.locale,
        voiceEnabled: next.voice_enabled,
        analyticsOpt: next.analytics_opt,
        heroAutoGenerate: next.hero_auto_generate,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          theme: next.theme,
          fontScale: next.font_scale,
          locale: next.locale,
          voiceEnabled: next.voice_enabled,
          analyticsOpt: next.analytics_opt,
          heroAutoGenerate: next.hero_auto_generate,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    if (isMissingRelationError(err, "user_settings")) {
      console.warn(
        "[settings] user_settings table missing; settings not persisted. Run db:migrate (0008).",
      );
      return next;
    }
    throw err;
  }

  return next;
}
