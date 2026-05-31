import { floorToWeekMonday } from "@/domain/calendar/week";

export function buildWeekPlanShareUrl(siteUrl: string, weekOf: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const week = floorToWeekMonday(weekOf);
  return `${base}/app/plan?week_of=${encodeURIComponent(week)}`;
}
