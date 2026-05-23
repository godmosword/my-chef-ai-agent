"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/utils/cn";

const CONFETTI_COLORS = [
  "var(--color-brand-primary)",
  "var(--color-brand-green)",
  "var(--color-cuisine-thai)",
  "var(--color-cuisine-japanese)",
];

export type CompletionScreenProps = {
  recipeId: string;
  recipeTitle: string;
  onRate: (stars: number) => Promise<void>;
  onCookAgain: () => void;
};

export function CompletionScreen({
  recipeId,
  recipeTitle,
  onRate,
  onCookAgain,
}: CompletionScreenProps) {
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 10) * 0.15}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [],
  );

  const submit = async (stars: number) => {
    setSubmitting(true);
    try {
      await onRate(stars);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="cooking-confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            backgroundColor: p.color,
          }}
          aria-hidden
        />
      ))}
      <h2 className="font-serif text-3xl text-text-ink">完成！</h2>
      <p className="mt-2 text-text-muted">{recipeTitle}</p>
      <p className="mt-6 text-lg text-text-ink">這道菜怎麼樣？</p>
      <div
        className="mt-4 flex gap-2"
        role="group"
        aria-label="評分"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={cn(
              "text-4xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
              (hover >= n || submitted) && "scale-110",
            )}
            aria-label={`${n} 星`}
            disabled={submitting || submitted}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onClick={() => submit(n)}
          >
            <span className={hover >= n ? "text-brand-primary" : "text-text-muted"}>
              ★
            </span>
          </button>
        ))}
      </div>
      {submitted && (
        <p className="mt-2 text-sm text-brand-primary">感謝你的評分！</p>
      )}
      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <Button asChild variant="secondary">
          <Link href={`/app/library/${recipeId}`}>回到食譜</Link>
        </Button>
        <Button variant="ghost" onClick={onCookAgain}>
          再做一次
        </Button>
      </div>
    </div>
  );
}
