import type { MealPattern, MealType } from "./types";

export function enumerateExpectedSlots(
  startDate: string,
  endDate: string,
  mealPattern: MealPattern,
): Array<{ slot_date: string; meal_type: MealType; slot_index: number }> {
  const out: Array<{ slot_date: string; meal_type: MealType; slot_index: number }> = [];
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  const types: MealType[] = [];
  if (mealPattern.breakfast) types.push("breakfast");
  if (mealPattern.lunch) types.push("lunch");
  if (mealPattern.dinner) types.push("dinner");
  if (mealPattern.snack) types.push("snack");

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    for (const meal_type of types) {
      out.push({ slot_date: dateStr, meal_type, slot_index: 0 });
    }
  }
  return out;
}

export function slotKey(
  slot_date: string,
  meal_type: string,
  slot_index: number,
): string {
  return `${slot_date}|${meal_type}|${slot_index}`;
}

export function isWeekendDate(dateStr: string): boolean {
  const day = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}
