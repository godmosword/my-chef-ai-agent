"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";

const CONFETTI_COLORS = [
  "var(--color-brand-primary)",
  "var(--color-brand-green)",
  "var(--color-cuisine-thai)",
  "var(--color-cuisine-japanese)",
];

export type CompletionScreenProps = {
  recipeId: string;
  recipeTitle: string;
  elapsedMinutes?: number | null;
  onRate: (stars: number) => Promise<void>;
  onCookAgain: () => void;
};

export function CompletionScreen({
  recipeId,
  recipeTitle,
  elapsedMinutes,
  onRate,
  onCookAgain,
}: CompletionScreenProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipped, setSkipped] = useState(false);

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

  const detailHref =
    recipeId === "demo" || recipeId.startsWith("demo")
      ? "/demo/recipe"
      : `/app/library/${recipeId}`;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="cooking-confetti-piece motion-reduce:hidden"
          style={{
            left: p.left,
            animationDelay: p.delay,
            backgroundColor: p.color,
          }}
          aria-hidden
        />
      ))}
      <p className="text-5xl" aria-hidden>
        🎉
      </p>
      <h2 className="mt-2 font-serif text-3xl text-text-ink">完成了！</h2>
      <p className="mt-2 text-text-muted">{recipeTitle}</p>
      {elapsedMinutes != null && elapsedMinutes > 0 ? (
        <p className="mt-3 text-sm text-text-body">實際花了 {elapsedMinutes} 分鐘</p>
      ) : null}
      <p className="mt-6 text-lg text-text-ink">下次再煮這道嗎？</p>
      <div
        className="mt-4 flex flex-wrap justify-center gap-2"
        role="group"
        aria-label="是否再做一次"
      >
        <Button
          type="button"
          variant="secondary"
          disabled={submitting || submitted || skipped}
          onClick={() => submit(5)}
        >
          👍 會
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting || submitted || skipped}
          onClick={() => submit(1)}
        >
          👎 不會
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={submitting || submitted}
          onClick={() => setSkipped(true)}
        >
          稍後再說
        </Button>
      </div>
      {submitted ? (
        <p className="mt-2 text-sm text-brand-primary">感謝你的回饋！</p>
      ) : null}
      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <Button asChild variant="secondary">
          <Link href={detailHref}>回到食譜</Link>
        </Button>
        <Button variant="ghost" onClick={onCookAgain}>
          回到首頁
        </Button>
      </div>
    </div>
  );
}
