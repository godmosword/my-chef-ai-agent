/** Fallback when steps lack `timer_seconds` (most AI recipes are string[]). */
export function parseTimerFromText(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;

  const hour = t.match(/(\d+)\s*小時/);
  if (hour) return Number(hour[1]) * 3600;

  const min =
    t.match(/(\d+)\s*分鐘?/) ??
    t.match(/(\d+)\s*分(?!鐘)/) ??
    t.match(/煮\s*(\d+)\s*分/) ??
    t.match(/煎\s*(\d+)\s*分/) ??
    t.match(/燉\s*(\d+)\s*分/) ??
    t.match(/靜置\s*(\d+)\s*分/);
  if (min) return Number(min[1]) * 60;

  const sec = t.match(/(\d+)\s*秒/);
  if (sec) return Number(sec[1]);

  return undefined;
}
