"use client";

import { useCallback, useState } from "react";
import { BackLink } from "@/components/patterns/BackLink";
import { Button } from "@/components/primitives/Button";
import { useMountAsync } from "@/hooks/useMountAsync";

type Prefs = {
  expiry_reminders_enabled: boolean;
  expiry_warn_days: number;
  expiry_reminder_frequency: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
  weekly_digest_enabled: boolean;
  weekly_digest_day: number;
  weekly_digest_hour: number;
  snooze_until: string | null;
  last_reminder_sent_at: string | null;
  daily_meal_push_enabled: boolean;
  daily_meal_morning_enabled: boolean;
  daily_meal_morning_hour: number;
  daily_meal_evening_enabled: boolean;
  daily_meal_evening_hour: number;
  shopping_reminder_enabled: boolean;
  shopping_reminder_day: number;
  shopping_reminder_hour: number;
  weekly_review_enabled: boolean;
  weekly_review_day: number;
  weekly_review_hour: number;
};

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoadFailed(false);
    try {
      const res = await fetch("/api/me/notifications");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { preferences?: Prefs };
      if (!isActive()) return;
      if (data.preferences) setPrefs(data.preferences);
      else setLoadFailed(true);
    } catch {
      if (isActive()) setLoadFailed(true);
    }
  }, []);

  useMountAsync((isActive) => load(isActive), [load]);

  const patch = async (body: Partial<Prefs>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/me/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.preferences) setPrefs(data.preferences);
    } finally {
      setSaving(false);
    }
  };

  const snooze = async (days: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/me/notifications/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (data.preferences) setPrefs(data.preferences);
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed) {
    return (
      <div className="space-y-4">
        <BackLink href="/app/settings" label="返回偏好" />
        <p className="text-sm text-text-muted">無法載入通知設定，請稍後再試。</p>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="space-y-4">
        <BackLink href="/app/settings" label="返回偏好" />
        <p className="text-sm text-text-muted">載入中…</p>
      </div>
    );
  }

  const snoozed =
    prefs.snooze_until && new Date(prefs.snooze_until) > new Date();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackLink href="/app/settings" label="返回偏好" />
      <header>
        <h1 className="font-serif text-2xl text-text-ink">🔔 通知設定</h1>
        <p className="mt-1 text-sm text-text-muted">
          效期提醒、安靜時段與週報（主動推播寫入 App 收件匣，非 LINE）
        </p>
      </header>

      {snoozed && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
          ⏸ 已暫停推播至{" "}
          {new Date(prefs.snooze_until!).toLocaleDateString("zh-TW")}
        </p>
      )}

      <section className="space-y-3 rounded-xl border border-surface-muted p-4">
        <h2 className="font-medium">過期提醒</h2>
        <p className="text-sm text-text-muted">
          目前：{prefs.expiry_reminders_enabled ? "開啟" : "關閉"}（
          {prefs.expiry_reminder_frequency === "smart"
            ? "智慧"
            : prefs.expiry_reminder_frequency}
          ）
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({ expiry_reminders_enabled: !prefs.expiry_reminders_enabled })
            }
          >
            {prefs.expiry_reminders_enabled ? "關閉" : "打開"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void patch({ expiry_reminder_frequency: "daily" })}
          >
            改為每日
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void patch({ expiry_reminder_frequency: "smart" })}
          >
            智慧提醒
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void patch({ expiry_reminder_frequency: "weekly_only" })}
          >
            只要週報
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-surface-muted p-4">
        <h2 className="font-medium">安靜時段</h2>
        <p className="text-sm">
          {String(prefs.quiet_hours_start).padStart(2, "0")}:00 –{" "}
          {String(prefs.quiet_hours_end).padStart(2, "0")}:00
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({ quiet_hours_start: 22, quiet_hours_end: 8 })
            }
          >
            預設 22:00–08:00
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({ quiet_hours_start: 23, quiet_hours_end: 7 })
            }
          >
            23:00–07:00
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-surface-muted p-4">
        <h2 className="font-medium">提前提醒</h2>
        <p className="text-sm">{prefs.expiry_warn_days} 天</p>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 5].map((d) => (
            <Button
              key={d}
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void patch({ expiry_warn_days: d })}
            >
              {d} 天
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-surface-muted p-4">
        <h2 className="font-medium">週日菜單摘要</h2>
        <p className="text-sm text-text-muted">
          {prefs.weekly_digest_enabled
            ? `已開啟（週${prefs.weekly_digest_day} ${prefs.weekly_digest_hour}:00）`
            : "關閉"}
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() =>
            void patch({
              weekly_digest_enabled: !prefs.weekly_digest_enabled,
              weekly_digest_day: 0,
              weekly_digest_hour: 19,
            })
          }
        >
          {prefs.weekly_digest_enabled ? "關閉週報" : "開啟週日 19:00"}
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border border-surface-muted p-4">
        <h2 className="font-medium">菜單推播</h2>
        <p className="text-sm text-text-muted">
          每日菜單預告：{prefs.daily_meal_morning_enabled ? `開啟（${prefs.daily_meal_morning_hour}:00）` : "關閉"}
          <br />
          晚餐前提醒：{prefs.daily_meal_evening_enabled ? `開啟（${prefs.daily_meal_evening_hour}:00）` : "關閉"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({
                daily_meal_morning_enabled: !prefs.daily_meal_morning_enabled,
              })
            }
          >
            {prefs.daily_meal_morning_enabled ? "關閉每日預告" : "打開每日預告"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({
                daily_meal_evening_enabled: !prefs.daily_meal_evening_enabled,
              })
            }
          >
            {prefs.daily_meal_evening_enabled ? "關閉晚餐提醒" : "打開晚餐提醒"}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-surface-muted p-4">
        <h2 className="font-medium">採買與週回顧</h2>
        <p className="text-sm text-text-muted">
          採買提醒：{prefs.shopping_reminder_enabled ? `週${prefs.shopping_reminder_day} ${prefs.shopping_reminder_hour}:00` : "關閉"}
          <br />
          週菜單回顧：{prefs.weekly_review_enabled ? `週${prefs.weekly_review_day} ${prefs.weekly_review_hour}:00` : "關閉"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({
                shopping_reminder_enabled: !prefs.shopping_reminder_enabled,
              })
            }
          >
            {prefs.shopping_reminder_enabled ? "關閉採買提醒" : "打開採買提醒"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({ weekly_review_enabled: !prefs.weekly_review_enabled })
            }
          >
            {prefs.weekly_review_enabled ? "關閉週回顧" : "打開週回顧"}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-surface-muted p-4">
        <h2 className="font-medium">暫時別吵我</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void snooze(1)}>
            1 天
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void snooze(7)}>
            1 週
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void snooze(30)}>
            1 個月
          </Button>
        </div>
      </section>

      {prefs.last_reminder_sent_at && (
        <p className="text-xs text-text-muted">
          上次提醒：{new Date(prefs.last_reminder_sent_at).toLocaleString("zh-TW")}
        </p>
      )}
    </div>
  );
}
