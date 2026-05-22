export function timeOfDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "早安";
  if (h >= 11 && h < 17) return "午安";
  if (h >= 17 && h < 23) return "晚安";
  return "深夜好";
}

export function formatDateSubtitle(now = new Date()): string {
  return now.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}
