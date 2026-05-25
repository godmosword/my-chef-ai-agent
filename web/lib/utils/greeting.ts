import {
  DEFAULT_DISPLAY_TIMEZONE,
  formatDateSubtitleZh,
  localDateKeyInTimeZone,
} from "@/lib/locale/datetime";

function hourInTimeZone(date: Date, timeZone = DEFAULT_DISPLAY_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value;
  return hour ? parseInt(hour, 10) : date.getHours();
}

export function timeOfDayGreeting(now = new Date()): string {
  const h = hourInTimeZone(now);
  if (h >= 5 && h < 11) return "早安";
  if (h >= 11 && h < 17) return "午安";
  if (h >= 17 && h < 23) return "晚安";
  return "深夜好";
}

export function formatDateSubtitle(now = new Date()): string {
  return formatDateSubtitleZh(now);
}

export function timeOfDaySubtitle(now = new Date()): string {
  const h = hourInTimeZone(now);
  if (h >= 5 && h < 11) return "今天想做點什麼？";
  if (h >= 11 && h < 17) return "今天午餐吃飽了嗎？";
  if (h >= 17 && h < 23) return "今晚想吃什麼？";
  return "明天的早餐想吃什麼？";
}

/** Hour bucket for analytics (no raw prompt). */
export function localHourBucket(now = new Date()): string {
  const h = hourInTimeZone(now);
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 23) return "evening";
  return "night";
}

export { localDateKeyInTimeZone };
