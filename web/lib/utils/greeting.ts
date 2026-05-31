import {
  DEFAULT_DISPLAY_TIMEZONE,
  formatDateSubtitleZh,
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

function timeOfDayGreeting(now = new Date()): string {
  const h = hourInTimeZone(now);
  if (h >= 5 && h < 11) return "早安";
  if (h >= 11 && h < 14) return "中午好";
  if (h >= 14 && h < 17) return "午後好";
  if (h >= 17 && h < 19) return "快下班了";
  if (h >= 19 && h < 22) return "晚上好";
  return "深夜好";
}

/** Line shown after date in app home header. */
export function getGreetingLine(now = new Date()): string {
  const weekday = new Intl.DateTimeFormat("zh-TW", {
    timeZone: DEFAULT_DISPLAY_TIMEZONE,
    weekday: "long",
  }).format(now);
  return `${weekday} · ${timeOfDayGreeting(now)}`;
}

export function isRushHour(now = new Date()): boolean {
  const h = hourInTimeZone(now);
  return h >= 17 && h < 19;
}

export function rushHourHint(): string {
  return "快下班了，今晚想吃什麼？";
}

export function formatDateSubtitle(now = new Date()): string {
  return formatDateSubtitleZh(now);
}
