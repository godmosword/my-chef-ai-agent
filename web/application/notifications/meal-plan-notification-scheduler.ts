/**
 * MP-4: should-send logic for daily meal pushes, shopping reminder, weekly review.
 */
import type { MealPlanRow, MealSlotRow } from "@/platform/db/meal-planning";
import type { NotificationPreferences } from "@/platform/db/notification-prefs";
import {
  getLocalParts,
  hoursSince,
  isInQuietHours,
} from "@/domain/notifications/quiet-hours";
import {
  mealPlanMorningIgnoreBackoffThreshold,
} from "@/platform/config/meal-plan-execution-config";
import type { SendDecision } from "./notification-scheduler";

function todayLocalStr(local: ReturnType<typeof getLocalParts>): string {
  const m = String(local.month).padStart(2, "0");
  const d = String(local.day).padStart(2, "0");
  return `${local.year}-${m}-${d}`;
}

function planCoversDate(plan: MealPlanRow, dateStr: string): boolean {
  return plan.start_date <= dateStr && plan.end_date >= dateStr;
}

function hasUncookedSlotsToday(slots: MealSlotRow[]): boolean {
  return slots.some((s) => s.status === "planned");
}

function hasUncookedDinnerToday(slots: MealSlotRow[]): boolean {
  return slots.some(
    (s) =>
      s.status === "planned" &&
      (s.meal_type === "dinner" || s.meal_type === "晚餐"),
  );
}

/** Morning push blocked when user's quiet window covers the morning hour. */
function morningHourInQuietHours(prefs: NotificationPreferences): boolean {
  const end = prefs.quiet_hours_end;
  const morning = prefs.daily_meal_morning_hour;
  if (end > morning) return true;
  return false;
}

export function shouldSendDailyMorning(
  prefs: NotificationPreferences,
  nowUtc: Date,
  activePlan: MealPlanRow | null,
  todaySlots: MealSlotRow[],
): SendDecision {
  if (!prefs.daily_meal_push_enabled || !prefs.daily_meal_morning_enabled) {
    return { send: false, reason: "disabled" };
  }
  if (prefs.snooze_until && new Date(prefs.snooze_until) > nowUtc) {
    return { send: false, reason: "snoozed" };
  }
  if (
    prefs.meal_plan_morning_backoff_until &&
    new Date(prefs.meal_plan_morning_backoff_until) > nowUtc
  ) {
    return { send: false, reason: "morning_backoff" };
  }
  if (!activePlan) return { send: false, reason: "no_active_plan" };

  const local = getLocalParts(nowUtc, prefs.timezone);
  const todayStr = todayLocalStr(local);
  if (!planCoversDate(activePlan, todayStr)) {
    return { send: false, reason: "plan_not_today" };
  }
  if (!todaySlots.length) {
    return { send: false, reason: "no_slots_today" };
  }
  if (!hasUncookedSlotsToday(todaySlots)) {
    return { send: false, reason: "all_done_today" };
  }
  if (local.hour !== prefs.daily_meal_morning_hour) {
    return { send: false, reason: "wrong_hour" };
  }
  if (morningHourInQuietHours(prefs)) {
    return { send: false, reason: "morning_in_quiet_hours" };
  }

  const hours = hoursSince(prefs.last_daily_morning_sent_at, nowUtc);
  if (hours != null && hours < 12) {
    return { send: false, reason: "dedupe_12h" };
  }

  if (
    prefs.meal_plan_morning_ignored_count >=
    mealPlanMorningIgnoreBackoffThreshold()
  ) {
    return { send: false, reason: "ignored_backoff_pending" };
  }

  return { send: true, reason: "morning_ok" };
}

export function shouldSendDailyEvening(
  prefs: NotificationPreferences,
  nowUtc: Date,
  activePlan: MealPlanRow | null,
  todaySlots: MealSlotRow[],
): SendDecision {
  if (!prefs.daily_meal_push_enabled || !prefs.daily_meal_evening_enabled) {
    return { send: false, reason: "disabled" };
  }
  if (prefs.snooze_until && new Date(prefs.snooze_until) > nowUtc) {
    return { send: false, reason: "snoozed" };
  }
  if (!activePlan) return { send: false, reason: "no_active_plan" };

  const local = getLocalParts(nowUtc, prefs.timezone);
  const todayStr = todayLocalStr(local);
  if (!planCoversDate(activePlan, todayStr)) {
    return { send: false, reason: "plan_not_today" };
  }
  if (!hasUncookedDinnerToday(todaySlots) && !hasUncookedSlotsToday(todaySlots)) {
    return { send: false, reason: "all_done_today" };
  }
  if (!hasUncookedSlotsToday(todaySlots)) {
    return { send: false, reason: "all_done_today" };
  }
  if (local.hour !== prefs.daily_meal_evening_hour) {
    return { send: false, reason: "wrong_hour" };
  }
  if (
    isInQuietHours(
      local.hour,
      prefs.quiet_hours_start,
      prefs.quiet_hours_end,
    )
  ) {
    return { send: false, reason: "quiet_hours" };
  }

  const hours = hoursSince(prefs.last_daily_evening_sent_at, nowUtc);
  if (hours != null && hours < 12) {
    return { send: false, reason: "dedupe_12h" };
  }

  return { send: true, reason: "evening_ok" };
}

export type ShoppingListSummary = {
  unchecked_count: number;
  section_counts: Record<string, number>;
  estimated_total: number | null;
};

export function shouldSendShoppingReminder(
  prefs: NotificationPreferences,
  nowUtc: Date,
  activePlan: MealPlanRow | null,
  shopping: ShoppingListSummary | null,
): SendDecision {
  if (!prefs.shopping_reminder_enabled) {
    return { send: false, reason: "disabled" };
  }
  if (prefs.snooze_until && new Date(prefs.snooze_until) > nowUtc) {
    return { send: false, reason: "snoozed" };
  }
  if (!activePlan) return { send: false, reason: "no_active_plan" };
  if (!shopping || shopping.unchecked_count < 1) {
    return { send: false, reason: "no_unchecked_items" };
  }

  const local = getLocalParts(nowUtc, prefs.timezone);
  if (local.weekday !== prefs.shopping_reminder_day) {
    return { send: false, reason: "wrong_day" };
  }
  if (local.hour !== prefs.shopping_reminder_hour) {
    return { send: false, reason: "wrong_hour" };
  }

  const hours = hoursSince(prefs.last_shopping_reminder_sent_at, nowUtc);
  if (hours != null && hours < 24 * 6) {
    return { send: false, reason: "dedupe_6d" };
  }

  return { send: true, reason: "shopping_ok" };
}

export function shouldSendWeeklyReview(
  prefs: NotificationPreferences,
  nowUtc: Date,
  activePlan: MealPlanRow | null,
): SendDecision {
  if (!prefs.weekly_review_enabled) {
    return { send: false, reason: "disabled" };
  }
  if (prefs.snooze_until && new Date(prefs.snooze_until) > nowUtc) {
    return { send: false, reason: "snoozed" };
  }
  if (!activePlan) return { send: false, reason: "no_active_plan" };

  const local = getLocalParts(nowUtc, prefs.timezone);
  const todayStr = todayLocalStr(local);
  const planEnding =
    activePlan.end_date <= todayStr ||
    activePlan.status === "completed";
  if (!planEnding && activePlan.status === "active") {
    if (activePlan.end_date > todayStr) {
      return { send: false, reason: "plan_not_ending" };
    }
  }

  if (local.weekday !== prefs.weekly_review_day) {
    return { send: false, reason: "wrong_day" };
  }
  if (local.hour !== prefs.weekly_review_hour) {
    return { send: false, reason: "wrong_hour" };
  }

  const hours = hoursSince(prefs.last_weekly_review_sent_at, nowUtc);
  if (hours != null && hours < 24 * 6) {
    return { send: false, reason: "dedupe_6d" };
  }

  return { send: true, reason: "weekly_review_ok" };
}

export function shouldSendNextWeekNudge(
  prefs: NotificationPreferences,
  nowUtc: Date,
  hasActivePlan: boolean,
  lastCompletedPlan: MealPlanRow | null,
): SendDecision {
  if (hasActivePlan) return { send: false, reason: "has_active_plan" };
  if (!lastCompletedPlan) return { send: false, reason: "no_completed_plan" };

  const local = getLocalParts(nowUtc, prefs.timezone);
  if (local.weekday !== 0) {
    return { send: false, reason: "not_sunday" };
  }
  if (local.hour !== 19) {
    return { send: false, reason: "wrong_hour" };
  }

  const hours = hoursSince(prefs.last_next_week_nudge_sent_at, nowUtc);
  if (hours != null && hours < 24 * 7) {
    return { send: false, reason: "dedupe_7d" };
  }

  return { send: true, reason: "next_week_nudge_ok" };
}
