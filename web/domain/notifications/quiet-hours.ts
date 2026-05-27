/**
 * Timezone-aware quiet hours (PT-4).
 * Taiwan has no DST; IANA tz still handles local wall clock correctly.
 */

export function isInQuietHours(
  localHour: number,
  quietStart: number,
  quietEnd: number,
): boolean {
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) {
    return localHour >= quietStart && localHour < quietEnd;
  }
  return localHour >= quietStart || localHour < quietEnd;
}

/** Returns local Date parts for a UTC instant in the given IANA timezone. */
export function getLocalParts(
  utc: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(utc);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24,
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

export function hoursSince(
  pastIso: string | null | undefined,
  nowUtc: Date,
): number | null {
  if (!pastIso) return null;
  const past = new Date(pastIso).getTime();
  if (!Number.isFinite(past)) return null;
  return (nowUtc.getTime() - past) / (1000 * 60 * 60);
}
