/**
 * PT-4: weekly pantry digest via inbox.
 */
import { shouldSendWeeklyDigest } from "@/application/notifications/notification-scheduler";
import { isWeeklyDigestEnabled } from "@/platform/config/notification-config";
import { findExpiringSoon, getPantrySummary } from "@/platform/db/pantry";
import {
  listNotificationPreferencesForTenant,
  markDigestSent,
} from "@/platform/db/notification-prefs";
import { insertNotificationInbox } from "@/platform/db/notification-inbox";
import { suggestUseItUpRecipes } from "@/application/pantry/use-it-up";
import {
  recordNotificationDecision,
  recordNotificationSweep,
} from "@/platform/observability/notification-metrics";
import { getLocalParts } from "@/domain/notifications/quiet-hours";

export type DigestSweepResult = {
  checked: number;
  sent: number;
  skipped: Record<string, number>;
};

export async function runWeeklyDigestSweep(
  tenantId: string,
  nowUtc: Date = new Date(),
): Promise<DigestSweepResult> {
  const skipped: Record<string, number> = {};
  let sent = 0;
  let checked = 0;

  if (!isWeeklyDigestEnabled()) {
    return { checked: 0, sent: 0, skipped: { feature_disabled: 1 } };
  }

  const all = await listNotificationPreferencesForTenant(tenantId);
  for (const prefs of all) {
    checked += 1;
    const decision = shouldSendWeeklyDigest(prefs, nowUtc);
    if (!decision.send) {
      skipped[decision.reason] = (skipped[decision.reason] ?? 0) + 1;
      recordNotificationDecision("digest", "skipped", decision.reason);
      continue;
    }

    const local = getLocalParts(nowUtc, prefs.timezone);
    const summary = await getPantrySummary(
      tenantId,
      prefs.user_id,
      7,
    );
    const expiring = await findExpiringSoon(tenantId, prefs.user_id, {
      days_ahead: 7,
    });
    const today = new Date().toISOString().slice(0, 10);
    const active = expiring.filter((i) => i.expires_at && i.expires_at >= today);

    const suggestions = await suggestUseItUpRecipes({
      tenant_id: tenantId,
      user_id: prefs.user_id,
      priority_ingredients: active,
      other_available: [],
      max_suggestions: 3,
      titles_only: true,
    });

    const shopping = [
      ...new Set(
        suggestions.flatMap((s) => s.additional_shopping).filter(Boolean),
      ),
    ].slice(0, 8);

    const payload = {
      date_label: `${local.month}/${local.day}`,
      summary,
      expiring_preview: active.slice(0, 5).map((i) => ({
        id: i.id,
        display_name: i.display_name,
        expires_at: i.expires_at,
      })),
      suggestions: suggestions.map((s) => ({
        title: s.recipe_title,
        cuisine: s.cuisine,
        estimated_time_min: s.estimated_time_min,
        rationale: s.rationale,
        suggestion_id: s.suggestion_id,
        has_full_recipe: Boolean(s.recipe_full),
      })),
      shopping,
    };

    const row = await insertNotificationInbox(
      tenantId,
      prefs.user_id,
      "weekly_digest",
      payload,
    );
    if (row) {
      await markDigestSent(tenantId, prefs.user_id);
      sent += 1;
      recordNotificationDecision("digest", "sent", decision.reason);
    } else {
      skipped.delivery_failed = (skipped.delivery_failed ?? 0) + 1;
    }
  }

  recordNotificationSweep("digest", "ok", checked);
  return { checked, sent, skipped };
}
