"use client";

import { Button } from "@/components/primitives/Button";

export type StepNavProps = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isLastStep: boolean;
};

export function StepNav({ canPrev, canNext, onPrev, onNext, isLastStep }: StepNavProps) {
  return (
    <nav
      className="flex shrink-0 gap-3 border-t border-border-default px-4 py-4"
      aria-label="步驟導航"
    >
      <Button
        variant="secondary"
        size="lg"
        className="flex-1"
        disabled={!canPrev}
        onClick={onPrev}
      >
        上一步
      </Button>
      <Button
        variant="primary"
        size="lg"
        className="flex-1"
        disabled={!canNext && !isLastStep}
        onClick={onNext}
      >
        {isLastStep ? "完成" : "下一步"}
      </Button>
    </nav>
  );
}
