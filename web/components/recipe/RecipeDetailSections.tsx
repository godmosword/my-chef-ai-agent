"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatIngredient, formatStep } from "@/lib/recipe-steps";
import { cn } from "@/lib/utils/cn";

type RecipeDetailSectionsProps = {
  ingredients?: unknown[] | null;
  steps?: unknown[] | null;
};

const STEPS_PREVIEW = 2;

export function RecipeDetailSections({ ingredients, steps }: RecipeDetailSectionsProps) {
  const ingList = ingredients ?? [];
  const stepList = steps ?? [];
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const canCollapse = stepList.length > STEPS_PREVIEW;
  const visibleSteps = stepsExpanded ? stepList : stepList.slice(0, STEPS_PREVIEW);

  return (
    <>
      {ingList.length > 0 && (
        <section>
          <h2 className="font-serif text-lg text-text-ink">食材</h2>
          <ul className="mt-2 list-inside list-disc text-text-body">
            {ingList.map((ing, i) => (
              <li key={i}>{formatIngredient(ing)}</li>
            ))}
          </ul>
        </section>
      )}
      {stepList.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-lg text-text-ink">步驟</h2>
            <span className="text-xs text-text-muted">共 {stepList.length} 步</span>
          </div>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-text-body">
            {visibleSteps.map((step, i) => (
              <li key={i}>{formatStep(step)}</li>
            ))}
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
