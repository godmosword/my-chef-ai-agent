"use client";

import { useState } from "react";
import type { Slot } from "@chef/shared-types";
import { putMealPlanSlot } from "@/application/api/plan";
import { capture } from "@/platform/analytics/events";
import { todayDateKeyInTimeZone } from "@/lib/locale/datetime";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { useToast } from "@/components/providers/ToastProvider";

const SLOTS: { id: Slot; label: string }[] = [
  { id: "breakfast", label: "早餐" },
  { id: "lunch", label: "午餐" },
  { id: "dinner", label: "晚餐" },
];

export type AddToWeekPlanButtonProps = {
  recipeId: string;
  recipeTitle?: string | null;
};

export function AddToWeekPlanButton({ recipeId, recipeTitle }: AddToWeekPlanButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<Slot>("dinner");
  const [saving, setSaving] = useState(false);
  const date = todayDateKeyInTimeZone();

  const onConfirm = async () => {
    setSaving(true);
    try {
      await putMealPlanSlot(date, slot, { recipe_id: recipeId });
      capture("meal_plan_added_from_tonight", { slot });
      toast({
        title: "已加入週菜單",
        description: recipeTitle
          ? `「${recipeTitle}」已排入 ${date} ${SLOTS.find((s) => s.id === slot)?.label}`
          : undefined,
        variant: "default",
      });
      setOpen(false);
    } catch (e) {
      toast({
        title: "無法加入週菜單",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        加入本週菜單
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="加入週菜單"
        description={`日期：${date}（今天）`}
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-text-ink">時段</legend>
          {SLOTS.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="meal-slot"
                checked={slot === s.id}
                onChange={() => setSlot(s.id)}
              />
              {s.label}
            </label>
          ))}
        </fieldset>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void onConfirm()}>
            {saving ? "加入中…" : "確認加入"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
