import {
  addDaysIso,
  formatWeekRangeLabel,
  currentWeekMonday as currentWeekMondayForDateKey,
  floorToWeekMonday as floorDateKeyToWeekMonday,
  isPastDate as isDateKeyPastDate,
  isToday as isDateKeyToday,
  parseIsoDateLocal,
  weekDates,
} from "@/domain/calendar/week";
import { DEFAULT_DISPLAY_TIMEZONE, localDateKeyInTimeZone } from "./datetime";

export { addDaysIso, formatWeekRangeLabel, parseIsoDateLocal, weekDates };

export function floorToWeekMonday(
  isoOrDate: string | Date,
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  const iso =
    typeof isoOrDate === "string"
      ? isoOrDate
      : localDateKeyInTimeZone(isoOrDate, timeZone);
  return floorDateKeyToWeekMonday(iso);
}

export function isToday(
  iso: string,
  now: Date = new Date(),
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): boolean {
  return isDateKeyToday(iso, localDateKeyInTimeZone(now, timeZone));
}

export function isPastDate(
  iso: string,
  now: Date = new Date(),
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): boolean {
  return isDateKeyPastDate(iso, localDateKeyInTimeZone(now, timeZone));
}

export function currentWeekMonday(
  now: Date = new Date(),
  timeZone: string = DEFAULT_DISPLAY_TIMEZONE,
): string {
  return currentWeekMondayForDateKey(localDateKeyInTimeZone(now, timeZone));
}
