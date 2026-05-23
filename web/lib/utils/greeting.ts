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

export function timeOfDaySubtitle(now = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "今天想做點什麼？";
  if (h >= 11 && h < 17) return "今天午餐吃飽了嗎？";
  if (h >= 17 && h < 23) return "今晚想吃什麼？";
  return "明天的早餐想吃什麼？";
}
