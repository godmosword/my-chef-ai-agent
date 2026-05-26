/** zh-TW week calendar: Monday as week start, user display timezone. */

import {
  DEFAULT_DISPLAY_TIMEZONE,
  localDateKeyInTimeZone,
  parseIsoDateLocal,
} from "@/lib/locale/datetime";

function formatIsoDate(d: Date): string {
  return localDateKeyInTimeZone(d, DEFAULT_DISPLAY_TIMEZONE);
}

export { parseIsoDateLocal };

/** Floor any date to Monday of that week (in display TZ). */
export function floorToWeekMonday(isoOrDate: string | Date): string {
  const iso =
    typeof isoOrDate === "string"
      ? isoOrDate
      : localDateKeyInTimeZone(isoOrDate, DEFAULT_DISPLAY_TIMEZONE);
  const d = parseIsoDateLocal(iso);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return formatIsoDate(d);
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDateLocal(iso);
  d.setDate(d.getDate() + days);
  return formatIsoDate(d);
}

export function weekDates(weekOfMonday: string): string[] {
  const monday = floorToWeekMonday(weekOfMonday);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
}

export function formatWeekRangeLabel(weekOfMonday: string): string {
  const start = floorToWeekMonday(weekOfMonday);
  const end = addDaysIso(start, 6);
  const s = parseIsoDateLocal(start);
  const e = parseIsoDateLocal(end);
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`;
}

export function isToday(iso: string, now = new Date()): boolean {
  return iso === formatIsoDate(now);
}

export function isPastDate(iso: string, now = new Date()): boolean {
  return parseIsoDateLocal(iso) < parseIsoDateLocal(formatIsoDate(now));
}

export function currentWeekMonday(now = new Date()): string {
  return floorToWeekMonday(now);
}
