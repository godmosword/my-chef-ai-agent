import { apiFetch } from "./client";
import type {
  AggregatedShoppingList,
  MealPlanSlot,
  PutMealPlanSlot,
  Slot,
  WeekPlan,
} from "@chef/shared-types";

export async function fetchWeekPlan(weekOf: string): Promise<WeekPlan> {
  const res = await apiFetch<{ ok: true } & WeekPlan>(
    `/api/plan?week_of=${encodeURIComponent(weekOf)}`,
  );
  return { week_of: res.week_of, slots: res.slots };
}

export async function putMealPlanSlot(
  date: string,
  slot: Slot,
  body: PutMealPlanSlot,
): Promise<MealPlanSlot> {
  const res = await apiFetch<{ ok: true; slot: MealPlanSlot }>(
    `/api/plan/${date}/${slot}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return res.slot;
}

export async function fetchShoppingList(weekOf: string): Promise<AggregatedShoppingList> {
  const res = await apiFetch<{ ok: true } & AggregatedShoppingList>(
    `/api/plan/shopping/${encodeURIComponent(weekOf)}`,
  );
  return {
    week_of: res.week_of,
    items: res.items,
    groups: res.groups,
  };
}
