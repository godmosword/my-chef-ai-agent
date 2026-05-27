/**
 * Build expiry reminder inbox payload (PT-4).
 */
import {
  expiryLabel,
  formatQuantityForDisplay,
  type PantryDisplayItem,
} from "@/domain/pantry/pantry-ui";
import type { PantryItem } from "@/platform/db/pantry";

export type ExpiryReminderItemView = {
  id: number;
  display_name: string;
  quantity_label: string;
  expiry_text: string;
  urgency: string;
  days_until: number | null;
};

export type ExpiryReminderPayload = {
  item_count: number;
  warn_days: number;
  items: ExpiryReminderItemView[];
  more_count: number;
  priority_item_ids: number[];
  show_disclaimer: boolean;
};

function toDisplayItem(item: PantryItem): PantryDisplayItem {
  return {
    id: item.id,
    display_name: item.display_name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    quantity_text: item.quantity_text,
    expires_at: item.expires_at,
    location: item.location,
    item_key: item.item_key,
    confidence: item.confidence,
  };
}

export function buildExpiryReminderPayload(
  items: PantryItem[],
  warnDays: number,
  showDisclaimer: boolean,
): ExpiryReminderPayload {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...items].sort((a, b) => {
    if (!a.expires_at && !b.expires_at) return 0;
    if (!a.expires_at) return 1;
    if (!b.expires_at) return -1;
    return a.expires_at.localeCompare(b.expires_at);
  });

  const top = sorted.slice(0, 5);
  const views: ExpiryReminderItemView[] = top.map((item) => {
    const exp = expiryLabel(toDisplayItem(item), today, warnDays);
    const t1 = item.expires_at
      ? new Date(`${item.expires_at}T12:00:00Z`).getTime()
      : null;
    const t0 = new Date(`${today}T12:00:00Z`).getTime();
    const daysUntil =
      t1 != null ? Math.round((t1 - t0) / (24 * 60 * 60 * 1000)) : null;
    let icon = "⚠️";
    if (daysUntil != null && daysUntil <= 1) icon = "🚨";
    return {
      id: item.id,
      display_name: item.display_name,
      quantity_label: formatQuantityForDisplay(toDisplayItem(item)),
      expiry_text: `${icon} ${exp.text}`,
      urgency: exp.urgency,
      days_until: daysUntil,
    };
  });

  return {
    item_count: sorted.length,
    warn_days: warnDays,
    items: views,
    more_count: Math.max(0, sorted.length - 5),
    priority_item_ids: sorted.map((i) => i.id),
    show_disclaimer: showDisclaimer,
  };
}

export const EXPIRY_DISCLAIMER_TEXT =
  "👋 這是你第一次收到我的主動提醒。我會在你冰箱有食材快過期時通知你，預設安靜時段 22:00–08:00。不想要的話隨時到「設定 → 通知」關閉。";
