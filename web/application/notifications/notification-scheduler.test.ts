import { describe, expect, it } from "vitest";
import { shouldSendExpiryReminder, shouldSendWeeklyDigest } from "./notification-scheduler";
import type { NotificationPreferences } from "@/platform/db/notification-prefs";
import type { PantryItem } from "@/platform/db/pantry";

function basePrefs(
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function item(expires: string, id = 1): PantryItem {
  return {
    id,
    tenant_id: "default",
    user_id: "u1",
    item_key: "spinach",
    display_name: "菠菜",
    category: "vegetable",
    quantity: 1,
    unit: "把",
    quantity_text: "1把",
    location: "fridge_main",
    expires_at: expires,
    purchased_at: "2026-05-01",
    source: "manual",
    confidence: 1,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("shouldSendExpiryReminder", () => {
  const soon = [item("2026-05-28")];

  it("disabled", () => {
    const r = shouldSendExpiryReminder(
      basePrefs({ expiry_reminders_enabled: false }),
      new Date("2026-05-27T02:00:00Z"),
      soon,
    );
    expect(r).toEqual({ send: false, reason: "disabled" });
  });

  it("snoozed", () => {
    const r = shouldSendExpiryReminder(
      basePrefs({ snooze_until: "2099-01-01T00:00:00Z" }),
      new Date("2026-05-27T02:00:00Z"),
      soon,
    );
    expect(r.reason).toBe("snoozed");
  });

  it("quiet hours at 22:00 and 03:00 Taipei", () => {
    const prefs = basePrefs();
    expect(
      shouldSendExpiryReminder(prefs, new Date("2026-05-27T14:00:00Z"), soon).reason,
    ).toBe("quiet_hours");
    expect(
      shouldSendExpiryReminder(prefs, new Date("2026-05-27T19:00:00Z"), soon).reason,
    ).toBe("quiet_hours");
  });

  it("allows at 09:00 local with expiring items", () => {
    const r = shouldSendExpiryReminder(
      basePrefs(),
      new Date("2026-05-27T01:00:00Z"),
      soon,
    );
    expect(r.send).toBe(true);
  });

  it("backoff when ignored >= 3", () => {
    const r = shouldSendExpiryReminder(
      basePrefs({ consecutive_ignored_count: 3 }),
      new Date("2026-05-27T01:00:00Z"),
      soon,
    );
    expect(r.reason).toBe("backoff");
  });

  it("smart too_soon within 36h", () => {
    const now = new Date("2026-05-27T01:00:00Z");
    const r = shouldSendExpiryReminder(
      basePrefs({
        last_reminder_sent_at: new Date(
          now.getTime() - 10 * 3600 * 1000,
        ).toISOString(),
      }),
      now,
      soon,
    );
    expect(r.reason).toBe("too_soon");
  });

  it("daily allows after 20h", () => {
    const now = new Date("2026-05-27T01:00:00Z");
    const last = new Date(now.getTime() - 21 * 3600 * 1000).toISOString();
    const r = shouldSendExpiryReminder(
      basePrefs({
        expiry_reminder_frequency: "daily",
        last_reminder_sent_at: last,
      }),
      now,
      soon,
    );
    expect(r.send).toBe(true);
    expect(r.reason).toBe("daily_ok");
  });
});

describe("shouldSendWeeklyDigest", () => {
  it("disabled by default", () => {
    const r = shouldSendWeeklyDigest(
      basePrefs(),
      new Date("2026-05-27T11:00:00Z"),
    );
    expect(r.reason).toBe("digest_disabled");
  });
});
