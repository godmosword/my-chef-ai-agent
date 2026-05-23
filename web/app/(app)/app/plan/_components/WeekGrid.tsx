"use client";

import type { MealPlanSlot, Slot } from "@chef/shared-types";
import { MEAL_SLOTS } from "@chef/shared-types";
import { parseIsoDateLocal } from "@/lib/locale/week";
import { PlanCell } from "./PlanCell";

const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export type WeekGridProps = {
  slots: MealPlanSlot[];
  weekDates: string[];
  isToday: (iso: string) => boolean;
  isPast: (iso: string) => boolean;
  onCellActivate: (date: string, slot: Slot) => void;
};

function slotAt(slots: MealPlanSlot[], date: string, slot: Slot): MealPlanSlot {
  return (
    slots.find((s) => s.date === date && s.slot === slot) ?? {
      date,
      slot,
      filled: false,
    }
  );
}

function weekdayLabel(iso: string): string {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  return labels[parseIsoDateLocal(iso).getDay()];
}

export function WeekGrid({
  slots,
  weekDates,
  isToday,
  isPast,
  onCellActivate,
}: WeekGridProps) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-16 p-2 text-left text-text-muted" />
              {weekDates.map((date) => (
                <th key={date} className="p-2 text-center font-medium text-text-ink">
                  <div>週{weekdayLabel(date)}</div>
                  <div className="text-xs text-text-muted">
                    {parseIsoDateLocal(date).getMonth() + 1}/{parseIsoDateLocal(date).getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_SLOTS.map((mealSlot) => (
              <tr key={mealSlot}>
                <td className="border-t border-border-default p-2 text-text-muted">
                  {SLOT_LABEL[mealSlot]}
                </td>
                {weekDates.map((date) => {
                  const cell = slotAt(slots, date, mealSlot);
                  return (
                    <td key={`${date}-${mealSlot}`} className="border-t border-border-default p-1">
                      <PlanCell
                        slot={cell}
                        isToday={isToday(date)}
                        isPast={isPast(date)}
                        onActivate={() => onCellActivate(date, mealSlot)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {weekDates.map((date) => (
          <div
            key={date}
            className="rounded-lg border border-border-default p-3"
          >
            <p className="mb-2 font-medium text-text-ink">
              週{weekdayLabel(date)} {parseIsoDateLocal(date).getMonth() + 1}/
              {parseIsoDateLocal(date).getDate()}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MEAL_SLOTS.map((mealSlot) => {
                const cell = slotAt(slots, date, mealSlot);
                return (
                  <PlanCell
                    key={mealSlot}
                    slot={cell}
                    isToday={isToday(date)}
                    isPast={isPast(date)}
                    onActivate={() => onCellActivate(date, mealSlot)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
