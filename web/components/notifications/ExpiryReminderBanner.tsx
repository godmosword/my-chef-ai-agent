"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { EXPIRY_DISCLAIMER_TEXT } from "@/application/notifications/expiry-reminder-payload";
import { Button } from "@/components/primitives/Button";
import { useMountAsync } from "@/hooks/useMountAsync";

type InboxItem = {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
};

type ExpiryItem = {
  id: number;
  display_name: string;
  quantity_label: string;
  expiry_text: string;
};

export function ExpiryReminderBanner() {
  const [items, setItems] = useState<InboxItem[]>([]);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const res = await fetch("/api/me/notifications/inbox");
      const data = (await res.json()) as { items?: InboxItem[] };
      if (isActive()) setItems(data.items ?? []);
    } catch {
      if (isActive()) setItems([]);
    }
  }, []);

  useMountAsync((isActive) => load(isActive), [load]);

  const dismiss = async (id: number) => {
    await fetch("/api/me/notifications/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const reminder = items.find((i) => i.kind === "expiry_reminder");
  const disclaimer = items.find((i) => i.kind === "expiry_disclaimer");

  if (!reminder && !disclaimer) return null;

  const payload = reminder?.payload as {
    item_count?: number;
    warn_days?: number;
    items?: ExpiryItem[];
    more_count?: number;
    priority_item_ids?: number[];
  } | undefined;

  const priorityIds = payload?.priority_item_ids ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-text-ink">
      {disclaimer && (
        <p className="text-text-muted">{EXPIRY_DISCLAIMER_TEXT}</p>
      )}
      {reminder && (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">⏰ 冰箱有食材快過期了</p>
              <p className="text-text-muted">
                {payload?.item_count ?? 0} 項食材在 {payload?.warn_days ?? 3} 天內要過期
              </p>
            </div>
            <button
              type="button"
              className="text-text-muted hover:text-text-ink"
              aria-label="關閉"
              onClick={() => void dismiss(reminder.id)}
            >
              ×
            </button>
          </div>
          <ul className="space-y-1">
            {(payload?.items ?? []).map((it) => (
              <li key={it.id}>
                {it.expiry_text} · {it.display_name} · {it.quantity_label}
              </li>
            ))}
            {(payload?.more_count ?? 0) > 0 && (
              <li className="text-text-muted">── 還有 {payload!.more_count} 項 ──</li>
            )}
          </ul>
          <div className="flex flex-wrap gap-2">
            <UseItUpButton priorityIds={priorityIds} onDone={() => void dismiss(reminder.id)} />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void snooze(7)}
            >
              一週別煩我
            </Button>
            <Link
              href="/app/settings/notifications"
              className="text-sm text-brand-primary underline"
            >
              通知設定
            </Link>
          </div>
        </>
      )}
      {disclaimer && !reminder && (
        <button
          type="button"
          className="text-sm text-text-muted underline"
          onClick={() => void dismiss(disclaimer.id)}
        >
          知道了
        </button>
      )}
    </div>
  );

  async function snooze(days: number) {
    await fetch("/api/me/notifications/snooze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    if (reminder) await dismiss(reminder.id);
  }
}

function UseItUpButton({
  priorityIds,
  onDone,
}: {
  priorityIds: number[];
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      disabled={loading || !priorityIds.length}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/me/pantry/use-it-up", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority_item_ids: priorityIds }),
          });
          const data = await res.json();
          if (data.ok && data.suggestions?.length) {
            sessionStorage.setItem(
              "chef_use_it_up_result",
              JSON.stringify(data),
            );
            window.location.href = "/app/pantry?use_it_up=1";
          }
          onDone();
        } finally {
          setLoading(false);
        }
      }}
    >
      🍳 用這些做菜
    </Button>
  );
}
