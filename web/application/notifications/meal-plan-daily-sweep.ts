/**
 * MP-4: cron sweep — meal plan pushes via in-app inbox.
 */
import {
  buildDailyEveningPayload,
  buildDailyMorningPayload,
  buildNextWeekNudgePayload,
  buildShoppingReminderPayload,
  buildWeeklyReviewPayload,
} from "./meal-plan-push-payloads";
import {
  shouldSendDailyEvening,
  shouldSendDailyMorning,
  shouldSendNextWeekNudge,
  shouldSendShoppingReminder,
  shouldSendWeeklyReview,
} from "./meal-plan-notification-scheduler";
import { buildWeeklyReviewInsights } from "@/application/meal-planning/weekly-review-insights";
import { generateReviewNarrative } from "@/application/meal-planning/weekly-review-narrative";
import { runMealPlanLifecycleSweep } from "./meal-plan-lifecycle-sweep";
import { getLocalParts } from "@/domain/notifications/quiet-hours";
import { notificationMaxPushesPerSweep } from "@/platform/config/notification-config";
import {
  isMealPlanExecutionPushEnabled,
  isWeeklyReviewEnabled,
  mealPlanMorningBackoffDays,
  mealPlanMorningIgnoreBackoffThreshold,
} from "@/platform/config/meal-plan-execution-config";
import {
  getActiveMealPlan,
  listSlotsForDateAll,
  listMealPlans,
  saveWeeklyReviewNarrative,
} from "@/platform/db/meal-planning";
import {
  getNotificationPreferences,
  getOrCreateNotificationPreferences,
  incrementMealPlanMorningIgnored,
  listUsersWithActiveMealPlans,
  markDailyEveningSent,
  markDailyMorningSent,
  markNextWeekNudgeSent,
  markShoppingReminderSent,
  markWeeklyReviewSent,
  updateNotificationPreferences,
} from "@/platform/db/notification-prefs";
import {
  insertNotificationInbox,
  type NotificationInboxKind,
} from "@/platform/db/notification-inbox";
import { getActiveListForPlan } from "@/platform/db/shopping-lists";
import { findExpiringSoon } from "@/platform/db/pantry";
import { hashUserIdForObservability } from "@/platform/observability/hash-user-id";

export type MealPlanSweepResult = {
  lifecycle: Awaited<ReturnType<typeof runMealPlanLifecycleSweep>>;
  morning: { sent: number; skipped: Record<string, number> };
  evening: { sent: number; skipped: Record<string, number> };
  shopping: { sent: number; skipped: Record<string, number> };
  weekly_review: { sent: number; skipped: Record<string, number> };
  next_week: { sent: number; skipped: Record<string, number> };
};

function bump(skipped: Record<string, number>, reason: string) {
  skipped[reason] = (skipped[reason] ?? 0) + 1;
}

function todayStr(timezone: string, nowUtc: Date): string {
  const local = getLocalParts(nowUtc, timezone);
  const m = String(local.month).padStart(2, "0");
  const d = String(local.day).padStart(2, "0");
  return `${local.year}-${m}-${d}`;
}

async function deliverInbox(
  tenantId: string,
  userId: string,
  kind: NotificationInboxKind,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const row = await insertNotificationInbox(tenantId, userId, kind, payload);
  return row != null;
}

export async function runMealPlanDailySweep(
  tenantId: string,
  nowUtc: Date = new Date(),
): Promise<MealPlanSweepResult> {
  const result: MealPlanSweepResult = {
    lifecycle: { completed: 0, low_engagement: 0 },
    morning: { sent: 0, skipped: {} },
    evening: { sent: 0, skipped: {} },
    shopping: { sent: 0, skipped: {} },
    weekly_review: { sent: 0, skipped: {} },
    next_week: { sent: 0, skipped: {} },
  };

  if (!isMealPlanExecutionPushEnabled()) {
    return result;
  }

  const max = notificationMaxPushesPerSweep();
  let totalSent = 0;

  const userIds = await listUsersWithActiveMealPlans(tenantId);

  for (const userId of userIds) {
    if (totalSent >= max) break;

    const prefs =
      (await getNotificationPreferences(tenantId, userId)) ??
      (await getOrCreateNotificationPreferences(tenantId, userId));
    if (!prefs) continue;

    const plan = await getActiveMealPlan(tenantId, userId);
    if (!plan) continue;

    const today = todayStr(prefs.timezone, nowUtc);
    const todaySlots = await listSlotsForDateAll(
      tenantId,
      userId,
      today,
      plan.id,
    );

    const morningDecision = shouldSendDailyMorning(
      prefs,
      nowUtc,
      plan,
      todaySlots,
    );
    if (morningDecision.send && totalSent < max) {
      const expiring = await findExpiringSoon(tenantId, userId, {
        days_ahead: prefs.expiry_warn_days,
      });
      const warn =
        expiring.length > 0
          ? `⚠️ ${expiring[0]?.display_name ?? "食材"}等快過期，記得用完`
          : undefined;
      const payload = buildDailyMorningPayload(
        todaySlots,
        prefs.timezone,
        nowUtc,
        warn,
      );
      if (
        await deliverInbox(
          tenantId,
          userId,
          "meal_plan_morning",
          payload,
        )
      ) {
        await markDailyMorningSent(tenantId, userId);
        result.morning.sent += 1;
        totalSent += 1;
        void hashUserIdForObservability(userId);
      }
    } else {
      bump(result.morning.skipped, morningDecision.reason);
    }

    const eveningDecision = shouldSendDailyEvening(
      prefs,
      nowUtc,
      plan,
      todaySlots,
    );
    if (eveningDecision.send && totalSent < max) {
      const payload = buildDailyEveningPayload(todaySlots);
      if (
        await deliverInbox(
          tenantId,
          userId,
          "meal_plan_evening",
          payload,
        )
      ) {
        await markDailyEveningSent(tenantId, userId);
        result.evening.sent += 1;
        totalSent += 1;
      }
    } else {
      bump(result.evening.skipped, eveningDecision.reason);
    }

    const list = await getActiveListForPlan(plan.id, tenantId, userId);
    const unchecked =
      list?.items?.filter((i) => !i.is_checked && !i.is_removed).length ?? 0;
    const sectionCounts: Record<string, number> = {};
    for (const item of list?.items ?? []) {
      if (item.is_checked || item.is_removed) continue;
      const sec = item.section ?? "其他";
      sectionCounts[sec] = (sectionCounts[sec] ?? 0) + 1;
    }
    const shopDecision = shouldSendShoppingReminder(prefs, nowUtc, plan, {
      unchecked_count: unchecked,
      section_counts: sectionCounts,
      estimated_total: list?.estimated_total_cost ?? null,
    });
    if (shopDecision.send && list && totalSent < max) {
      const payload = buildShoppingReminderPayload(
        {
          unchecked_count: unchecked,
          estimated_total: list.estimated_total_cost,
          section_counts: sectionCounts,
        },
        list.id,
        plan.id,
      );
      if (
        await deliverInbox(
          tenantId,
          userId,
          "meal_plan_shopping",
          payload,
        )
      ) {
        await markShoppingReminderSent(tenantId, userId);
        result.shopping.sent += 1;
        totalSent += 1;
      }
    } else {
      bump(result.shopping.skipped, shopDecision.reason);
    }

    if (isWeeklyReviewEnabled()) {
      const reviewDecision = shouldSendWeeklyReview(prefs, nowUtc, plan);
      if (reviewDecision.send && totalSent < max) {
        const insights = await buildWeeklyReviewInsights(
          plan.id,
          tenantId,
          userId,
        );
        if (insights) {
          const { narrative } = await generateReviewNarrative(insights);
          await saveWeeklyReviewNarrative(
            plan.id,
            tenantId,
            userId,
            narrative,
          );
          const payload = buildWeeklyReviewPayload(insights, narrative);
          if (
            await deliverInbox(
              tenantId,
              userId,
              "meal_plan_weekly_review",
              payload,
            )
          ) {
            await markWeeklyReviewSent(tenantId, userId);
            result.weekly_review.sent += 1;
            totalSent += 1;
          }
        }
      } else {
        bump(result.weekly_review.skipped, reviewDecision.reason);
      }
    }
  }

  // Next-week nudge for users without active plan
  const allPrefs = await import("@/platform/db/notification-prefs").then(
    (m) => m.listNotificationPreferencesForTenant(tenantId),
  );
  for (const prefs of allPrefs) {
    if (totalSent >= max) break;
    const active = await getActiveMealPlan(tenantId, prefs.user_id);
    if (active) continue;
    const completed = await listMealPlans(tenantId, prefs.user_id, {
      status_filter: "completed",
      limit: 1,
    });
    const last = completed[0];
    const nudge = shouldSendNextWeekNudge(
      prefs,
      nowUtc,
      false,
      last ?? null,
    );
    if (!nudge.send) {
      bump(result.next_week.skipped, nudge.reason);
      continue;
    }
    const summary = last
      ? `${last.start_date}～${last.end_date} 的條件`
      : "上週條件";
    const payload = buildNextWeekNudgePayload(summary);
    if (
      await deliverInbox(
        tenantId,
        prefs.user_id,
        "meal_plan_next_week",
        payload,
      )
    ) {
      await markNextWeekNudgeSent(tenantId, prefs.user_id);
      result.next_week.sent += 1;
      totalSent += 1;
    }
  }

  result.lifecycle = await runMealPlanLifecycleSweep(tenantId, nowUtc);
  await updateMealPlanMorningEngagement(tenantId, nowUtc);
  return result;
}

/** Morning push ignored → backoff after threshold (run hourly). */
async function updateMealPlanMorningEngagement(
  tenantId: string,
  nowUtc: Date = new Date(),
): Promise<void> {
  const threshold = mealPlanMorningIgnoreBackoffThreshold();
  const days = mealPlanMorningBackoffDays();
  const { listNotificationPreferencesForTenant } = await import(
    "@/platform/db/notification-prefs"
  );
  const all = await listNotificationPreferencesForTenant(tenantId);

  for (const prefs of all) {
    if (!prefs.last_daily_morning_sent_at) continue;
    const sentAt = new Date(prefs.last_daily_morning_sent_at).getTime();
    const hours = (nowUtc.getTime() - sentAt) / (1000 * 60 * 60);
    if (hours < 24) continue;

    const interacted =
      prefs.last_interaction_at &&
      new Date(prefs.last_interaction_at).getTime() > sentAt;

    if (interacted) {
      if (prefs.meal_plan_morning_ignored_count > 0) {
        const { resetMealPlanMorningIgnored } = await import(
          "@/platform/db/notification-prefs"
        );
        await resetMealPlanMorningIgnored(tenantId, prefs.user_id);
      }
      continue;
    }

    if (prefs.meal_plan_morning_ignored_count < threshold) {
      await incrementMealPlanMorningIgnored(tenantId, prefs.user_id);
    } else if (!prefs.meal_plan_morning_backoff_until) {
      const until = new Date(nowUtc);
      until.setUTCDate(until.getUTCDate() + days);
      await updateNotificationPreferences(tenantId, prefs.user_id, {
        meal_plan_morning_backoff_until: until.toISOString(),
      });
    }
  }
}
