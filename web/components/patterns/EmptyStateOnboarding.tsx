"use client";

import { ChefHat } from "lucide-react";
import { STARTER_PROMPTS } from "@/lib/prompts/starter";

type Props = {
  onPick: (message: string) => void;
  disabled?: boolean;
};

export function EmptyStateOnboarding({ onPick, disabled }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border-default bg-surface-muted p-6 text-center">
      <ChefHat className="mx-auto size-8 text-text-muted" aria-hidden />
      <p className="mt-2 text-sm text-text-body">還沒有食譜，先試試這 3 個情境</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p.value)}
            className="rounded-full border border-border-default bg-surface-default px-3 py-1.5 text-xs text-text-body transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
