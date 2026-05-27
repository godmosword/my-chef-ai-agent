"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MealPlanSlot, Slot } from "@chef/shared-types";
import { FLAGS } from "@/platform/config/flags";
import { Sheet } from "@/components/primitives/Sheet";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";

const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export type SlotInspectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: MealPlanSlot | null;
  onServingsChange: (servings: number) => Promise<void>;
  onNotesChange: (notes: string | null) => Promise<void>;
  onClear: () => Promise<void>;
  onReplace: () => void;
};

export function SlotInspector({
  open,
  onOpenChange,
  slot,
  onServingsChange,
  onNotesChange,
  onClear,
  onReplace,
}: SlotInspectorProps) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotes(slot?.notes ?? "");
  }, [slot?.id, slot?.notes]);

  if (!slot?.filled || !slot.recipe) return null;

  const servings = slot.servings ?? 2;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title={`${slot.recipe.title} · ${SLOT_LABEL[slot.slot]}`}
    >
      <div className="flex flex-col gap-4">
        {slot.recipe.hero_url && (
          <img
            src={slot.recipe.hero_url}
            alt=""
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">人數</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || servings <= 1}
            onClick={() => run(() => onServingsChange(servings - 1))}
          >
            −
          </Button>
          <span className="min-w-[2ch] text-center font-medium">{servings}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || servings >= 20}
            onClick={() => run(() => onServingsChange(servings + 1))}
          >
            +
          </Button>
        </div>
        <div>
          <label className="text-sm text-text-muted">備註</label>
          <Input
            className="mt-1"
            value={notes}
            onChange={setNotes}
            onBlur={() => run(() => onNotesChange(notes.trim() || null))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="secondary">
            <Link href={`/app/library/${slot.recipe.id}`}>開啟食譜</Link>
          </Button>
          {FLAGS.cookingMode && (
            <Button asChild variant="secondary">
              <Link href={`/app/library/${slot.recipe.id}/cook`}>進入烹飪</Link>
            </Button>
          )}
          <Button variant="secondary" onClick={onReplace}>
            換一道
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => run(async () => {
              await onClear();
              onOpenChange(false);
            })}
          >
            移除
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
