import { displayDateKey } from "@/lib/locale/datetime";

export function daysSinceIso(iso: string | null): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const diff = Date.now() - then;
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function chefTitle(daysCooking: number): string {
  if (daysCooking >= 365) return "傳家名廚";
  if (daysCooking >= 180) return "家常老手";
  if (daysCooking >= 60) return "穩定下廚的人";
  if (daysCooking >= 14) return "練習中的廚師";
  if (daysCooking > 0) return "剛開始的味蕾探險家";
  return "今日的廚房新手";
}

/** "yyyy-mm-dd" in local time, NOT UTC. */
export function localDateKey(date: Date = new Date()): string {
  return displayDateKey(date);
}

export function cookedToday(lastRecipeAt: string | null): boolean {
  if (!lastRecipeAt) return false;
  const last = new Date(lastRecipeAt);
  if (Number.isNaN(last.getTime())) return false;
  return localDateKey(last) === localDateKey();
}
