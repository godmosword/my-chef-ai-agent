import { aggregateShoppingListFromPlans } from "@/domain/plan/shopping-list";
import { floorToWeekMonday } from "@/domain/calendar/week";
import { listPlansWithShoppingForWeek } from "@/platform/db/queries/meal-plans";

export async function aggregateShoppingList(
  userId: string,
  tenantId: string,
  weekOfInput: string,
) {
  const week_of = floorToWeekMonday(weekOfInput);
  const plans = await listPlansWithShoppingForWeek(userId, tenantId, week_of);
  return aggregateShoppingListFromPlans(week_of, plans);
}
