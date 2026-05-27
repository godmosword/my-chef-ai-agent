"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatStepForPantry } from "@/domain/pantry/step-note";
import { isPantryMatch, pantryNameKeys } from "@/domain/pantry/tonight";
import { formatIngredient, formatStep } from "@/domain/recipe/recipe-steps";
import { FLAGS } from "@/platform/config/flags";
import { useTonightPantry } from "@/hooks/useTonightPantry";
import { ServingToggle } from "@/components/recipe/ServingToggle";
import { scaleIngredient } from "@/domain/recipe/recipe-scale";
import { readProgress, writeProgress } from "@/domain/recipe/recipe-progress";
import { cn } from "@/lib/utils/cn";
import { StepImageButton } from "@/components/recipe/StepImageButton";

type RecipeDetailSectionsProps = {
  recipeId?: string;
  ingredients?: unknown[] | null;
  steps?: unknown[] | null;
  servings?: number | null;
};

const SCALE_OPTIONS = [0.5, 1, 2, 4] as const;

export function RecipeDetailSections({
  recipeId,
  ingredients,
  steps,
  servings,
}: RecipeDetailSectionsProps) {
  const { items: pantryItems } = useTonightPantry();
  const pantry = FLAGS.pantryTonight ? pantryItems : [];
  const ingList = ingredients ?? [];
  const stepList = steps ?? [];
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
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  const toggleStep = (i: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      const wasChecked = next.has(i);
      if (wasChecked) next.delete(i);
      else {
        next.add(i);
        const nextIndex = i + 1;
        if (nextIndex < stepList.length) {
          requestAnimationFrame(() => {
            stepRefs.current[nextIndex]?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        }
      }
      return next;
    });
  };

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
            <ServingToggle
              value={scale}
              options={SCALE_OPTIONS}
              onChange={setScale}
            />
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
                    <span
                      className={cn(
                        checked && "text-text-muted line-through",
                        !checked &&
                          pantry.length > 0 &&
                          isPantryMatch(
                            typeof ing === "object" && ing && "name" in ing
                              ? String((ing as { name: string }).name)
                              : String(ing),
                            pantryNameKeys(pantry),
                          ) &&
                          "text-text-muted",
                      )}
                    >
                      {formatIngredient(ing)}
                      {pantry.length > 0 &&
                      isPantryMatch(
                        typeof ing === "object" && ing && "name" in ing
                          ? String((ing as { name: string }).name)
                          : String(ing),
                        pantryNameKeys(pantry),
                      ) ? (
                        <span className="ml-1 text-xs text-brand-primary">（家裡已有）</span>
                      ) : null}
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
          <ol className="mt-2 space-y-3 text-text-body">
            {stepList.map((step, i) => {
              const checked = checkedSteps.has(i);
              return (
                <li
                  key={i}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  className="scroll-mt-20"
                >
                  <div className="space-y-1.5">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStep(i)}
                        className="mt-1 size-4 shrink-0 rounded border-border-default text-brand-primary focus:ring-brand-primary"
                      />
                      <span
                        className={cn(
                          "flex flex-1 gap-3",
                          checked && "text-fg-tertiary line-through transition-colors duration-200",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                            checked
                              ? "bg-surface-muted text-text-muted"
                              : "bg-accent-100 text-accent-700",
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 text-base leading-relaxed">
                          {pantry.length
                            ? formatStepForPantry(step, pantry)
                            : formatStep(step)}
                        </span>
                      </span>
                    </label>
                    {recipeId && (
                      <div className="pl-7">
                        <StepImageButton recipeId={recipeId} stepIndex={i} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-text-muted">
            邊做邊看？點「進入烹飪模式」，一步一畫面、可語音、附計時器。
          </p>
        </section>
      )}
    </>
  );
}

function formatServings(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(1).replace(/\.?0+$/, "");
}
