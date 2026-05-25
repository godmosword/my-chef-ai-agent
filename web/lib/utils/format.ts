import { DEFAULT_DISPLAY_TIMEZONE } from "@/lib/locale/datetime";

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: DEFAULT_DISPLAY_TIMEZONE,
  }).format(new Date(iso));
}
