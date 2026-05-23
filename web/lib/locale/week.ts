/** zh-TW week calendar: Monday as week start, local timezone dates. */

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Floor any date to Monday of that week (local). */
export function floorToWeekMonday(isoOrDate: string | Date): string {
  const d =
    typeof isoOrDate === "string" ? parseIsoDateLocal(isoOrDate) : new Date(isoOrDate);
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
  return parseIsoDateLocal(iso) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function currentWeekMonday(now = new Date()): string {
  return floorToWeekMonday(now);
}
