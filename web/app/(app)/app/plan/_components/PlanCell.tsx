"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { MealPlanSlot } from "@chef/shared-types";
import { cn } from "@/lib/utils/cn";

export type PlanCellProps = {
  slot: MealPlanSlot;
  isToday: boolean;
  isPast: boolean;
  onActivate: () => void;
};

export function planCellId(date: string, slot: string): string {
  return `${date}|${slot}`;
}

export function PlanCell({ slot, isToday, isPast, onActivate }: PlanCellProps) {
  const id = planCellId(slot.date, slot.slot);
  const { setNodeRef: dropRef, isOver } = useDroppable({ id });
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id,
    disabled: !slot.filled,
  });

  const setRef = (el: HTMLDivElement | null) => {
    dropRef(el);
    if (slot.filled) dragRef(el);
  };

  return (
    <div
      ref={setRef}
      className={cn(
        "relative min-h-[4.5rem] rounded-lg border border-border-default p-2 transition-colors",
        isToday && "ring-1 ring-brand-primary",
        isPast && "opacity-60",
        isOver && "border-brand-primary bg-brand-primaryLight/40",
        isDragging && "opacity-40",
      )}
    >
      {slot.filled && slot.recipe ? (
        <button
          type="button"
          className="flex h-full w-full flex-col items-start gap-1 text-left"
          onClick={onActivate}
          {...listeners}
          {...attributes}
        >
          {slot.recipe.hero_url ? (
            <img
              src={slot.recipe.hero_url}
              alt=""
              className="h-12 w-full rounded object-cover"
            />
          ) : (
            <div className="flex h-12 w-full items-center justify-center rounded bg-surface-muted text-xs text-text-muted">
              無圖
            </div>
          )}
          <span className="line-clamp-2 text-xs font-medium text-text-ink">
            {slot.recipe.title}
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="flex h-full min-h-[4rem] w-full flex-col items-center justify-center gap-1 text-text-muted hover:text-brand-primary"
          onClick={onActivate}
          aria-label="新增餐點"
        >
          <Plus className="size-5" aria-hidden />
          <span className="text-xs">新增</span>
        </button>
      )}
    </div>
  );
}
