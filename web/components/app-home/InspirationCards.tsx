"use client";

import { useCallback } from "react";
import { ArrowUpRight } from "lucide-react";
import { INSPIRATIONS } from "@/lib/copy/inspirations";
import { cn } from "@/lib/utils/cn";

export type InspirationCardsProps = {
  onPick: (prefill: string) => void;
  disabled?: boolean;
};

export function InspirationCards({ onPick, disabled }: InspirationCardsProps) {
  const handleClick = useCallback(
    (prefill: string) => {
      if (disabled) return;
      onPick(prefill);
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (isDesktop) {
        const el = document.getElementById("hero-prompt");
        el?.focus({ preventScroll: true });
      }
    },
    [disabled, onPick],
  );

  return (
    <section aria-label="今晚靈感" className="space-y-3">
      <h2 className="font-serif text-lg text-text-ink">今晚靈感</h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {INSPIRATIONS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleClick(item.prefill)}
              className={cn(
                "group flex w-full flex-col rounded-xl border border-border-default bg-surface-default p-4 text-left transition-all",
                "hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-card motion-reduce:transform-none",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-brand-primary">
                {item.tag}
              </span>
              <span className="mt-1 font-serif text-lg text-text-ink">{item.title}</span>
              <span className="mt-0.5 text-sm text-text-muted">{item.description}</span>
              <ArrowUpRight
                className="mt-3 ml-auto size-4 text-text-muted group-hover:text-brand-primary"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
