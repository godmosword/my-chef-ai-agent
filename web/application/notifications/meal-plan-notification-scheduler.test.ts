import { describe, expect, it } from "vitest";
import type { NotificationPreferences } from "@/platform/db/notification-prefs";
import type { MealPlanRow, MealSlotRow } from "@/platform/db/meal-planning";
import {
  shouldSendDailyEvening,
  shouldSendDailyMorning,
  shouldSendNextWeekNudge,
  shouldSendShoppingReminder,
  shouldSendWeeklyReview,
} from "./meal-plan-notification-scheduler";

function mpPrefs(
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences {
  return {
    tenant_id: "default",
    user_id: "u1",
    expiry_reminders_enabled: true,
    expiry_warn_days: 3,
    expiry_reminder_frequency: "smart",
    quiet_hours_start: 22,
    quiet_hours_end: 8,
    timezone: "Asia/Taipei",
    weekly_digest_enabled: false,
    weekly_digest_day: 0,
    weekly_digest_hour: 19,
    last_reminder_sent_at: null,
    last_digest_sent_at: null,
    snooze_until: null,
    consecutive_ignored_count: 0,
    last_interaction_at: null,
    first_reminder_disclaimer_sent: false,
    backoff_until: null,
    daily_meal_push_enabled: true,
    daily_meal_morning_hour: 9,
    daily_meal_evening_hour: 17,
    daily_meal_evening_minute: 0,
    daily_meal_morning_enabled: true,
    daily_meal_evening_enabled: true,
    shopping_reminder_enabled: true,
    shopping_reminder_day: 5,
    shopping_reminder_hour: 9,
    weekly_review_enabled: true,
    weekly_review_day: 6,
    weekly_review_hour: 19,
    last_daily_morning_sent_at: null,
    last_daily_evening_sent_at: null,
    last_shopping_reminder_sent_at: null,
    last_weekly_review_sent_at: null,
    meal_plan_morning_ignored_count: 0,
    meal_plan_morning_backoff_until: null,
    last_next_week_nudge_sent_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function plan(overrides: Partial<MealPlanRow> = {}): MealPlanRow {
  return {
    id: 1,
    tenant_id: "default",
    user_id: "u1",
    start_date: "2026-05-20",
    end_date: "2026-05-28",
    meal_pattern: { breakfast: false, lunch: true, dinner: true },
    constraints: {
      start_date: "2026-05-20",
      end_date: "2026-05-28",
      meal_pattern: { breakfast: false, lunch: true, dinner: true },
    },
    target_household_member_ids: [],
    status: "active",
    name: null,
    total_estimated_cost: 1400,
    pantry_reuse_score: 0.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activated_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

function slot(status: MealSlotRow["status"] = "planned"): MealSlotRow {
  return {
    id: 1,
    meal_plan_id: 1,
    tenant_id: "default",
    user_id: "u1",
    slot_date: "2026-05-28",
    meal_type: "dinner",
    slot_index: 0,
    dish_title: "紅燒雞腿",
    cuisine: "台式",
    estimated_time_min: 25,
    effort_level: "medium",
    key_ingredients: [],
    estimated_cost: null,
    tags: [],
    rationale: null,
    full_recipe_json: null,
    full_recipe_generated_at: null,
    status,
    cooked_at: null,
    skipped_at: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("shouldSendDailyMorning", () => {
  // 2026-05-28 is Thu in Taipei; 01:00 UTC = 09:00 Taipei
  const nineAm = new Date("2026-05-28T01:00:00Z");

  it("sends at 9am with active plan and planned slot", () => {
    const r = shouldSendDailyMorning(
      mpPrefs(),
      nineAm,
      plan(),
      [slot("planned")],
    );
    expect(r).toEqual({ send: true, reason: "morning_ok" });
  });

  it("rejects wrong hour", () => {
    const r = shouldSendDailyMorning(
      mpPrefs(),
      new Date("2026-05-28T03:00:00Z"),
      plan(),
      [slot()],
    );
    expect(r.reason).toBe("wrong_hour");
  });

  it("rejects when no active plan", () => {
    expect(
      shouldSendDailyMorning(mpPrefs(), nineAm, null, [slot()]).reason,
    ).toBe("no_active_plan");
  });

  it("rejects when all slots done", () => {
    expect(
      shouldSendDailyMorning(mpPrefs(), nineAm, plan(), [slot("cooked")])
        .reason,
    ).toBe("all_done_today");
  });

  it("rejects when disabled", () => {
    expect(
      shouldSendDailyMorning(
        mpPrefs({ daily_meal_morning_enabled: false }),
        nineAm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("disabled");
  });

  it("rejects while snoozed", () => {
    expect(
      shouldSendDailyMorning(
        mpPrefs({ snooze_until: "2026-05-28T02:00:00.000Z" }),
        nineAm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("snoozed");
  });

  it("rejects during morning backoff", () => {
    expect(
      shouldSendDailyMorning(
        mpPrefs({
          meal_plan_morning_backoff_until: "2026-05-28T02:00:00.000Z",
        }),
        nineAm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("morning_backoff");
  });

  it("rejects when plan does not cover today", () => {
    expect(
      shouldSendDailyMorning(
        mpPrefs(),
        nineAm,
        plan({ start_date: "2026-05-20", end_date: "2026-05-27" }),
        [slot()],
      ).reason,
    ).toBe("plan_not_today");
  });

  it("rejects when no slots exist today", () => {
    expect(shouldSendDailyMorning(mpPrefs(), nineAm, plan(), []).reason).toBe(
      "no_slots_today",
    );
  });

  it("rejects morning hour covered by quiet hours", () => {
    expect(
      shouldSendDailyMorning(
        mpPrefs({ quiet_hours_end: 10 }),
        nineAm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("morning_in_quiet_hours");
  });

  it("rejects duplicate morning sends within 12 hours", () => {
    expect(
      shouldSendDailyMorning(
        mpPrefs({ last_daily_morning_sent_at: "2026-05-28T00:30:00.000Z" }),
        nineAm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("dedupe_12h");
  });

  it("rejects when ignored-count backoff is pending", () => {
    expect(
      shouldSendDailyMorning(
        mpPrefs({ meal_plan_morning_ignored_count: 999 }),
        nineAm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("ignored_backoff_pending");
  });
});

describe("shouldSendDailyEvening", () => {
  const fivePm = new Date("2026-05-28T09:00:00Z");

  it("sends at 17:00 with planned dinner", () => {
    const r = shouldSendDailyEvening(
      mpPrefs(),
      fivePm,
      plan(),
      [slot("planned")],
    );
    expect(r.send).toBe(true);
  });

  it("rejects while snoozed", () => {
    expect(
      shouldSendDailyEvening(
        mpPrefs({ snooze_until: "2026-05-28T10:00:00.000Z" }),
        fivePm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("snoozed");
  });

  it("rejects when active plan does not include today", () => {
    expect(
      shouldSendDailyEvening(
        mpPrefs(),
        fivePm,
        plan({ end_date: "2026-05-27" }),
        [slot()],
      ).reason,
    ).toBe("plan_not_today");
  });

  it("rejects when every slot is already done", () => {
    expect(
      shouldSendDailyEvening(mpPrefs(), fivePm, plan(), [slot("cooked")])
        .reason,
    ).toBe("all_done_today");
  });

  it("rejects quiet hours", () => {
    expect(
      shouldSendDailyEvening(
        mpPrefs({ quiet_hours_start: 16, quiet_hours_end: 20 }),
        fivePm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("quiet_hours");
  });

  it("rejects duplicate evening sends within 12 hours", () => {
    expect(
      shouldSendDailyEvening(
        mpPrefs({ last_daily_evening_sent_at: "2026-05-28T08:30:00.000Z" }),
        fivePm,
        plan(),
        [slot()],
      ).reason,
    ).toBe("dedupe_12h");
  });
});

describe("shouldSendShoppingReminder", () => {
  const friNine = new Date("2026-05-29T01:00:00Z");

  it("sends on configured day with unchecked items", () => {
    const r = shouldSendShoppingReminder(mpPrefs(), friNine, plan(), {
      unchecked_count: 3,
      section_counts: { 蔬果: 2 },
      estimated_total: 1000,
    });
    expect(r).toEqual({ send: true, reason: "shopping_ok" });
  });

  it("rejects empty list", () => {
    expect(
      shouldSendShoppingReminder(mpPrefs(), friNine, plan(), {
        unchecked_count: 0,
        section_counts: {},
        estimated_total: null,
      }).reason,
    ).toBe("no_unchecked_items");
  });

  it("rejects when shopping reminders are disabled", () => {
    expect(
      shouldSendShoppingReminder(
        mpPrefs({ shopping_reminder_enabled: false }),
        friNine,
        plan(),
        { unchecked_count: 1, section_counts: {}, estimated_total: null },
      ).reason,
    ).toBe("disabled");
  });

  it("rejects when scheduled day does not match", () => {
    expect(
      shouldSendShoppingReminder(mpPrefs({ shopping_reminder_day: 4 }), friNine, plan(), {
        unchecked_count: 1,
        section_counts: {},
        estimated_total: null,
      }).reason,
    ).toBe("wrong_day");
  });

  it("rejects duplicate shopping reminders within six days", () => {
    expect(
      shouldSendShoppingReminder(
        mpPrefs({ last_shopping_reminder_sent_at: "2026-05-28T01:00:00.000Z" }),
        friNine,
        plan(),
        { unchecked_count: 1, section_counts: {}, estimated_total: null },
      ).reason,
    ).toBe("dedupe_6d");
  });
});

describe("shouldSendWeeklyReview", () => {
  const satSeven = new Date("2026-05-30T11:00:00Z");

  it("sends when plan ends today", () => {
    const r = shouldSendWeeklyReview(
      mpPrefs(),
      satSeven,
      plan({ end_date: "2026-05-30" }),
    );
    expect(r.send).toBe(true);
  });

  it("rejects active plans that are not ending yet", () => {
    expect(
      shouldSendWeeklyReview(
        mpPrefs(),
        satSeven,
        plan({ end_date: "2026-06-01" }),
      ).reason,
    ).toBe("plan_not_ending");
  });

  it("rejects wrong review day", () => {
    expect(
      shouldSendWeeklyReview(
        mpPrefs({ weekly_review_day: 5 }),
        satSeven,
        plan({ end_date: "2026-05-30" }),
      ).reason,
    ).toBe("wrong_day");
  });

  it("rejects duplicate weekly reviews within six days", () => {
    expect(
      shouldSendWeeklyReview(
        mpPrefs({ last_weekly_review_sent_at: "2026-05-29T11:00:00.000Z" }),
        satSeven,
        plan({ end_date: "2026-05-30" }),
      ).reason,
    ).toBe("dedupe_6d");
  });
});

describe("shouldSendNextWeekNudge", () => {
  const sundaySeven = new Date("2026-05-31T11:00:00Z");

  it("sends on Sunday evening after a completed plan", () => {
    const r = shouldSendNextWeekNudge(
      mpPrefs(),
      sundaySeven,
      false,
      plan({ status: "completed", end_date: "2026-05-30" }),
    );
    expect(r).toEqual({ send: true, reason: "next_week_nudge_ok" });
  });

  it("rejects users with an active plan", () => {
    expect(
      shouldSendNextWeekNudge(
        mpPrefs(),
        sundaySeven,
        true,
        plan({ status: "completed" }),
      ).reason,
    ).toBe("has_active_plan");
  });

  it("rejects when no completed plan exists", () => {
    expect(
      shouldSendNextWeekNudge(mpPrefs(), sundaySeven, false, null).reason,
    ).toBe("no_completed_plan");
  });

  it("rejects duplicate nudges within seven days", () => {
    expect(
      shouldSendNextWeekNudge(
        mpPrefs({ last_next_week_nudge_sent_at: "2026-05-30T11:00:00.000Z" }),
        sundaySeven,
        false,
        plan({ status: "completed" }),
      ).reason,
    ).toBe("dedupe_7d");
  });
});
