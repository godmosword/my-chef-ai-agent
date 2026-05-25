/**
 * User-facing dates in a fixed IANA timezone (default Asia/Taipei).
 * Storage remains UTC timestamps; display and "today" boundaries use local TZ.
 */

export const DEFAULT_DISPLAY_TIMEZONE =
  process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE?.trim() || "Asia/Taipei";

/** YYYY-MM-DD in the given timezone. */
export function localDateKeyInTimeZone(
  date: Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function displayDateKey(
  date: Date = new Date(),
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  return localDateKeyInTimeZone(date, timeZone);
}

export function todayDateKeyInTimeZone(
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  return displayDateKey(new Date(), timeZone);
}

/** zh-TW long date + weekday for headers. */
export function formatDateSubtitleZh(
  date: Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysIsoLocal(iso: string, days: number): string {
  const d = parseIsoDateLocal(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
