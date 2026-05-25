"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import type { MealPlanSlot, Slot, WeekPlan } from "@chef/shared-types";
import { fetchWeekPlan, putMealPlanSlot } from "@/lib/api/plan";
import {
  addDaysIso,
  currentWeekMonday,
  floorToWeekMonday,
  formatWeekRangeLabel,
  isPastDate,
  isToday,
  weekDates,
} from "@/lib/locale/week";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { SectionHeader } from "@/components/patterns/SectionHeader";
import { WeekGrid } from "./_components/WeekGrid";
import { PickRecipeSheet } from "./_components/PickRecipeSheet";
import { SlotInspector } from "./_components/SlotInspector";
import { capture } from "@/lib/analytics/events";
function parseCellId(id: string): { date: string; slot: Slot } | null {
  const [date, slot] = id.split("|");
  if (!date || !slot) return null;
  if (slot !== "breakfast" && slot !== "lunch" && slot !== "dinner") return null;
  return { date, slot };
}

export function PlanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const initialWeek = floorToWeekMonday(
    searchParams.get("week_of") ?? currentWeekMonday(),
  );
  const [weekOf, setWeekOf] = useState(initialWeek);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const [pickTarget, setPickTarget] = useState<{ date: string; slot: Slot } | null>(
    null,
  );
  const [inspect, setInspect] = useState<MealPlanSlot | null>(null);

  const dates = useMemo(() => weekDates(weekOf), [weekOf]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWeekPlan(weekOf);
      setPlan(data);
      const normalized = floorToWeekMonday(data.week_of);
      if (normalized !== weekOf) setWeekOf(normalized);
      router.replace(`/app/plan?week_of=${normalized}`, { scroll: false });
    } catch (e) {
      toast({
        title: "無法載入週菜單",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [weekOf, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 1000, tolerance: 8 } }),
  );

  const upsertLocal = (slot: MealPlanSlot) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const slots = prev.slots.map((s) =>
        s.date === slot.date && s.slot === slot.slot ? slot : s,
      );
      return { ...prev, slots };
    });
  };

  const putSlot = async (
    date: string,
    slot: Slot,
    body: { recipe_id: string | null; servings?: number; notes?: string | null },
  ) => {
    const updated = await putMealPlanSlot(date, slot, body);
    if (body.recipe_id) {
      capture("meal_plan_recipe_added", { slot });
    }
    upsertLocal(updated);
    return updated;
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const from = parseCellId(String(event.active.id));
    const to = event.over ? parseCellId(String(event.over.id)) : null;
    if (!from || !to || (from.date === to.date && from.slot === to.slot)) return;

    const source = plan?.slots.find(
      (s) => s.date === from.date && s.slot === from.slot && s.filled,
    );
    if (!source?.recipe) return;

    const prev = plan;
    try {
      await putSlot(to.date, to.slot, {
        recipe_id: source.recipe.id,
        servings: source.servings ?? 2,
        notes: source.notes ?? null,
      });
      await putSlot(from.date, from.slot, { recipe_id: null });
    } catch (e) {
      setPlan(prev ?? null);
      toast({
        title: "無法移動餐點",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
      await load();
    }
  };

  const onCellActivate = (date: string, slot: Slot) => {
    const cell = plan?.slots.find((s) => s.date === date && s.slot === slot);
    if (cell?.filled) {
      setInspect(cell);
    } else {
      setPickTarget({ date, slot });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="上週"
            onClick={() => setWeekOf(addDaysIso(weekOf, -7))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="font-serif text-2xl text-text-ink">
            本週（{formatWeekRangeLabel(weekOf)}）
          </h1>
          <Button
            variant="ghost"
            size="sm"
            aria-label="下週"
            onClick={() => setWeekOf(addDaysIso(weekOf, 7))}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/app/shopping?week_of=${weekOf}`}>
            <ShoppingCart className="size-4" aria-hidden />
            生成買菜清單
          </Link>
        </Button>
      </div>

      {loading && <p className="text-text-muted">載入週菜單…</p>}

      {!loading && plan && (
        <>
          <SectionHeader title="本週餐點" />
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <WeekGrid
            slots={plan.slots}
            weekDates={dates}
            isToday={isToday}
            isPast={isPastDate}
            onCellActivate={onCellActivate}
          />
        </DndContext>
        </>
      )}

      {pickTarget && (
        <PickRecipeSheet
          open
          onOpenChange={(o) => !o && setPickTarget(null)}
          date={pickTarget.date}
          slot={pickTarget.slot}
          onPicked={async (recipeId) => {
            await putSlot(pickTarget.date, pickTarget.slot, { recipe_id: recipeId });
          }}
        />
      )}

      <SlotInspector
        open={Boolean(inspect)}
        onOpenChange={(o) => !o && setInspect(null)}
        slot={inspect}
        onServingsChange={async (servings) => {
          await putSlot(inspect!.date, inspect!.slot, {
            recipe_id: inspect!.recipe!.id,
            servings,
            notes: inspect!.notes ?? null,
          });
        }}
        onNotesChange={async (notes) => {
          await putSlot(inspect!.date, inspect!.slot, {
            recipe_id: inspect!.recipe!.id,
            servings: inspect!.servings ?? 2,
            notes,
          });
        }}
        onClear={async () => {
          await putSlot(inspect!.date, inspect!.slot, { recipe_id: null });
        }}
        onReplace={() => {
          if (!inspect) return;
          setPickTarget({ date: inspect.date, slot: inspect.slot });
          setInspect(null);
        }}
      />
    </div>
  );
}
