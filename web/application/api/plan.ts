import { apiFetch } from "./client";
import type {
  AggregatedShoppingList,
  MealPlanSlot,
  PutMealPlanSlot,
  Slot,
  WeekPlan,
} from "@chef/shared-types";
import {
  AggregatedShoppingListResponseSchema,
  PutMealPlanSlotResponseSchema,
  WeekPlanResponseSchema,
} from "@chef/shared-types";

export async function fetchWeekPlan(weekOf: string): Promise<WeekPlan> {
  const res = await apiFetch(
    `/api/plan?week_of=${encodeURIComponent(weekOf)}`,
    undefined,
    WeekPlanResponseSchema,
  );
  return { week_of: res.week_of, slots: res.slots };
}

export async function putMealPlanSlot(
  date: string,
  slot: Slot,
  body: PutMealPlanSlot,
): Promise<MealPlanSlot> {
  const res = await apiFetch(
    `/api/plan/${date}/${slot}`,
    { method: "PUT", body: JSON.stringify(body) },
    PutMealPlanSlotResponseSchema,
  );
  return res.slot;
}

export async function fetchShoppingList(weekOf: string): Promise<AggregatedShoppingList> {
  const res = await apiFetch(
    `/api/plan/shopping/${encodeURIComponent(weekOf)}`,
    undefined,
    AggregatedShoppingListResponseSchema,
  );
  return {
    week_of: res.week_of,
    items: res.items,
    groups: res.groups,
  };
}
