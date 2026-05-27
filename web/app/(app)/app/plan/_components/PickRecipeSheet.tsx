"use client";

import { useEffect, useState } from "react";
import type { Slot } from "@chef/shared-types";
import { generateRecipe, listRecipes } from "@/application/api/recipes";
import { recipeListItemToCard } from "@/domain/recipe/recipe-display";
import { Sheet } from "@/components/primitives/Sheet";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";

const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export type PickRecipeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  slot: Slot;
  onPicked: (recipeId: string) => Promise<void>;
};

export function PickRecipeSheet({
  open,
  onOpenChange,
  date,
  slot,
  onPicked,
}: PickRecipeSheetProps) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ReturnType<typeof recipeListItemToCard>[]>([]);
  const [loading, setLoading] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listRecipes({ limit: 24, q: q.trim() || undefined });
        if (!cancelled) setItems(res.items.map(recipeListItemToCard));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, q]);

  const pick = async (recipeId: string) => {
    try {
      await onPicked(recipeId);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "無法加入規劃",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    }
  };

  const onGenerate = async () => {
    if (!genPrompt.trim()) return;
    setGenerating(true);
    try {
      const res = await generateRecipe({ message: genPrompt.trim() });
      const id = res.recipe.id;
      if (!id) throw new Error("未取得食譜 id");
      await pick(id);
    } catch (e) {
      toast({
        title: "生成失敗",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const [, m, d] = date.split("-").map(Number);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={`為 ${m}/${d} ${SLOT_LABEL[slot]} 選擇食譜`}
    >
      <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto">
        <Input
          placeholder="搜尋既有食譜…"
          value={q}
          onChange={setQ}
        />
        <div className="grid grid-cols-3 gap-2">
          {loading && (
            <p className="col-span-3 text-sm text-text-muted">載入中…</p>
          )}
          {!loading &&
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-lg border border-border-default p-2 text-left hover:border-brand-primary"
                onClick={() => pick(item.id)}
              >
                {item.heroUrl ? (
                  <img
                    src={item.heroUrl}
                    alt=""
                    className="mb-1 h-14 w-full rounded object-cover"
                  />
                ) : (
                  <div className="mb-1 h-14 rounded bg-surface-muted" />
                )}
                <span className="line-clamp-2 text-xs">{item.title}</span>
              </button>
            ))}
        </div>
        <div className="border-t border-border-default pt-4">
          <p className="mb-2 text-sm font-medium text-text-ink">或快速生成新食譜</p>
          <Textarea
            placeholder="描述今天想吃什麼…"
            value={genPrompt}
            onChange={setGenPrompt}
            minRows={3}
          />
          <Button
            className="mt-2 w-full"
            loading={generating}
            onClick={onGenerate}
          >
            生成並加入
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
