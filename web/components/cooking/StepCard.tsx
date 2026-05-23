"use client";

import { Lightbulb } from "lucide-react";
import type { CookingStep } from "@/lib/cooking/types";

export type StepCardProps = {
  step: CookingStep;
  stepIndex: number;
  totalSteps: number;
  swipeRef: React.RefObject<HTMLDivElement | null>;
};

export function StepCard({ step, stepIndex, totalSteps, swipeRef }: StepCardProps) {
  return (
    <div
      ref={swipeRef}
      className="flex min-h-0 flex-1 flex-col justify-center px-4 py-6"
    >
      <p className="text-lg text-text-muted">
        {stepIndex + 1} / {totalSteps}
      </p>
      <p className="mt-4 font-serif text-[1.75rem] leading-snug text-text-ink md:text-[2rem]">
        {step.text}
      </p>
      {step.tip && (
        <p className="mt-4 flex items-start gap-2 text-lg italic text-text-muted">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-primary" aria-hidden />
          <span>{step.tip}</span>
        </p>
      )}
    </div>
  );
}
