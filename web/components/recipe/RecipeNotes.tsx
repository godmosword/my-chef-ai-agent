"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen, Sparkles } from "lucide-react";

type RecipeNotesProps = {
  recipeId?: string;
};

function storageKey(id: string): string {
  return `recipe-${id}-notes`;
}

export function RecipeNotes({ recipeId }: RecipeNotesProps) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!recipeId) return;
    try {
      const raw = window.localStorage.getItem(storageKey(recipeId));
      setValue(raw ?? "");
      initialized.current = true;
    } catch {
      /* ignore */
    }
  }, [recipeId]);

  const handleBlur = () => {
    if (!recipeId || !initialized.current) return;
    try {
      if (value.trim()) {
        window.localStorage.setItem(storageKey(recipeId), value);
      } else {
        window.localStorage.removeItem(storageKey(recipeId));
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch {
      /* quota exceeded */
    }
  };

  if (!recipeId) return null;

  return (
    <section className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 font-serif text-lg text-text-ink">
            <NotebookPen className="size-4 text-brand-primary" aria-hidden />
            我的筆記
          </h2>
          {saved && (
            <span aria-live="polite" className="text-xs text-text-muted">
              已儲存
            </span>
          )}
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="這道菜做了哪些調整？下次想試什麼？"
          rows={3}
          className="w-full resize-y rounded-lg border border-border-default bg-surface-default p-3 text-sm text-text-body placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <p className="mt-1 text-xs text-text-muted">僅儲存在這台裝置</p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-default bg-surface-muted/30 px-4 py-3 text-sm text-text-muted">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
        <p>
          營養標示估算<span className="ml-2 rounded-full bg-surface-default px-2 py-0.5 text-xs">即將推出</span>
          <br />
          會根據食材分量推估每份熱量、蛋白質、碳水、脂肪。
        </p>
      </div>
    </section>
  );
}
