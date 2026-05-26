"use client";

import Image from "next/image";
import { Lightbulb, Loader2 } from "lucide-react";
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
      {(step.imageUrl ||
        step.imageStatus === "pending" ||
        step.imageStatus === "generating") && (
        <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-border-default bg-surface-muted">
          {step.imageUrl && step.imageStatus === "ready" ? (
            <Image
              src={step.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 className="size-5 animate-spin text-brand-primary" aria-hidden />
              步驟插圖生成中…
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-3xl font-medium leading-tight text-fg-primary md:text-5xl">
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
