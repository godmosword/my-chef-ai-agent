"use client";

import { useEffect, useState } from "react";
import {
  readDinnerReminder,
  requestNotificationPermission,
  writeDinnerReminder,
  type DinnerReminderSettings,
} from "@/lib/notifications/dinner-reminder";
import {
  armDinnerReminderSchedule,
  disarmDinnerReminderSchedule,
} from "@/lib/notifications/dinner-reminder-scheduler";

const TIME_OPTIONS = [
  { label: "17:00", hour: 17, minute: 0 },
  { label: "17:30", hour: 17, minute: 30 },
  { label: "18:00", hour: 18, minute: 0 },
] as const;

export function DinnerReminderCard() {
  const [settings, setSettings] = useState<DinnerReminderSettings | null>(null);

  useEffect(() => {
    const s = readDinnerReminder();
    setSettings(s);
    if (s.enabled) armDinnerReminderSchedule(s);
  }, []);

  if (!settings) return null;

  const persist = (next: DinnerReminderSettings) => {
    setSettings(next);
    writeDinnerReminder(next);
    if (next.enabled) armDinnerReminderSchedule(next);
    else disarmDinnerReminderSchedule();
  };

  return (
    <section
      aria-label="晚餐提醒"
      className="rounded-xl border border-border-default bg-surface-muted/40 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-text-ink">晚餐提醒</h2>
          <p className="mt-1 text-sm text-text-muted">
            每天固定時間提醒你開 App 想晚餐（需將 App 加到主畫面，iOS 16.4+）
          </p>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={async (e) => {
              const enabled = e.target.checked;
              if (enabled) {
                const perm = await requestNotificationPermission();
                if (perm !== "granted") {
                  persist({ ...settings, enabled: false });
                  return;
                }
              }
              persist({ ...settings, enabled });
            }}
            className="size-4 rounded border-border-default text-brand-primary"
          />
          開啟
        </label>
      </div>
      {settings.enabled ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {TIME_OPTIONS.map((opt) => {
            const active =
              settings.hour === opt.hour && settings.minute === opt.minute;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  persist({ ...settings, hour: opt.hour, minute: opt.minute })
                }
                className={
                  active
                    ? "rounded-full bg-brand-primary px-3 py-1 text-xs text-brand-greenText"
                    : "rounded-full border border-border-default px-3 py-1 text-xs text-text-body"
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
