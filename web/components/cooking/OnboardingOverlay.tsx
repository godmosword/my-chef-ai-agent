"use client";

import { useState } from "react";
import { Button } from "@/components/primitives/Button";

const ONBOARD_KEY = "cooking_onboarded_v1";

export function hasCookingOnboarded(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(ONBOARD_KEY) === "1";
}

export function markCookingOnboarded(): void {
  localStorage.setItem(ONBOARD_KEY, "1");
}

export type OnboardingOverlayProps = {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

const STEPS = [
  {
    title: "切換步驟",
    body: "左右滑動，或使用螢幕下方的上一步／下一步。",
  },
  {
    title: "計時器",
    body: "步驟旁可啟動計時，最多同時 3 個。",
  },
  {
    title: "螢幕常亮與語音",
    body: "螢幕會盡量保持常亮；右上角可開關語音播報。",
  },
];

export function OnboardingOverlay({ open, onComplete, onSkip }: OnboardingOverlayProps) {
  const [idx, setIdx] = useState(0);
  if (!open) return null;

  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-text-ink/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cooking-onboard-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-border-default bg-surface-default p-6">
        <p className="text-sm text-text-muted">
          {idx + 1} / {STEPS.length}
        </p>
        <h2 id="cooking-onboard-title" className="mt-2 font-serif text-xl text-text-ink">
          {step.title}
        </h2>
        <p className="mt-2 text-text-body">{step.body}</p>
        <div className="mt-6 flex flex-col gap-2">
          {isLast ? (
            <Button
              onClick={() => {
                markCookingOnboarded();
                onComplete();
              }}
            >
              開始烹飪
            </Button>
          ) : (
            <Button onClick={() => setIdx((i) => i + 1)}>下一步</Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              markCookingOnboarded();
              onSkip();
            }}
          >
            跳過
          </Button>
        </div>
      </div>
    </div>
  );
}
