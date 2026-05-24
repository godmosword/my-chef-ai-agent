"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatIngredient, formatStep } from "@/lib/recipe-steps";
import { scaleIngredient } from "@/lib/recipe-scale";
import { readProgress, writeProgress } from "@/lib/recipe-progress";
import { cn } from "@/lib/utils/cn";

type RecipeDetailSectionsProps = {
  recipeId?: string;
  ingredients?: unknown[] | null;
  steps?: unknown[] | null;
  servings?: number | null;
};

const STEPS_PREVIEW = 2;
const SCALE_OPTIONS = [0.5, 1, 2, 4] as const;

export function RecipeDetailSections({
  recipeId,
  ingredients,
  steps,
  servings,
}: RecipeDetailSectionsProps) {
  const ingList = ingredients ?? [];
  const stepList = steps ?? [];
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(() => new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!recipeId) return;
    const p = readProgress(recipeId);
    setCheckedIngredients(new Set(p.ingredients));
    setCheckedSteps(new Set(p.steps));
  }, [recipeId]);

  useEffect(() => {
    if (!recipeId) return;
    writeProgress(recipeId, {
      ingredients: Array.from(checkedIngredients),
      steps: Array.from(checkedSteps),
    });
  }, [recipeId, checkedIngredients, checkedSteps]);

  const toggleIngredient = (i: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  const toggleStep = (i: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  const canCollapse = stepList.length > STEPS_PREVIEW;
  const visibleSteps = stepsExpanded ? stepList : stepList.slice(0, STEPS_PREVIEW);

  const scaledIngredients = useMemo(
    () => ingList.map((ing) => scaleIngredient(ing, scale)),
    [ingList, scale],
  );
  const baseServings = servings && servings > 0 ? servings : null;
  const scaledServings = baseServings ? baseServings * scale : null;

  return (
    <>
      {ingList.length > 0 && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-lg text-text-ink">
              食材
              {scaledServings ? (
                <span className="ml-2 text-sm text-text-muted">
                  · 約 {formatServings(scaledServings)} 人份
                </span>
              ) : null}
            </h2>
            <div className="flex gap-1" role="group" aria-label="調整份量">
              {SCALE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setScale(opt)}
                  aria-pressed={scale === opt}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs tabular-nums transition-colors",
                    scale === opt
                      ? "bg-brand-primary text-brand-greenText"
                      : "bg-surface-muted text-text-muted hover:bg-surface-default",
                  )}
                >
                  {opt}x
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-2 space-y-1.5 text-text-body">
            {scaledIngredients.map((ing, i) => {
              const checked = checkedIngredients.has(i);
              return (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIngredient(i)}
                      className="mt-1 size-4 shrink-0 rounded border-border-default text-brand-primary focus:ring-brand-primary"
                    />
                    <span className={cn(checked && "text-text-muted line-through")}>
                      {formatIngredient(ing)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {stepList.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-lg text-text-ink">步驟</h2>
            <span className="text-xs text-text-muted">共 {stepList.length} 步</span>
          </div>
          <ol className="mt-2 space-y-2 text-text-body">
            {visibleSteps.map((step, i) => {
              const checked = checkedSteps.has(i);
              return (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStep(i)}
                      className="mt-1 size-4 shrink-0 rounded border-border-default text-brand-primary focus:ring-brand-primary"
                    />
                    <span
                      className={cn(
                        "flex-1",
                        checked && "text-text-muted line-through",
                      )}
                    >
                      <span className="mr-2 font-medium tabular-nums text-text-muted">
                        {i + 1}.
                      </span>
                      {formatStep(step)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
          {canCollapse && (
            <button
              type="button"
              onClick={() => setStepsExpanded((v) => !v)}
              className={cn(
                "mt-3 inline-flex items-center gap-1 rounded-lg border border-border-default px-3 py-1.5 text-xs text-text-muted",
                "hover:border-brand-primary hover:text-brand-primaryDark",
              )}
            >
              {stepsExpanded ? (
                <>
                  收合步驟
                  <ChevronUp className="size-3" aria-hidden />
                </>
              ) : (
                <>
                  看完整 {stepList.length} 步
                  <ChevronDown className="size-3" aria-hidden />
                </>
              )}
            </button>
          )}
          {!stepsExpanded && canCollapse && (
            <p className="mt-3 text-xs text-text-muted">
              邊做邊看？直接點下方「進入烹飪模式」，一步一畫面、可語音、附計時器。
            </p>
          )}
        </section>
      )}
    </>
  );
}

function formatServings(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(1).replace(/\.?0+$/, "");
}
