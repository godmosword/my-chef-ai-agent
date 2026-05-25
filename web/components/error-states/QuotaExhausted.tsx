"use client";

import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/utils/cn";

export type QuotaExhaustedProps = {
  textUsed: number;
  textLimit: number;
  imageUsed: number;
  imageLimit: number;
  className?: string;
};

export function QuotaExhausted({
  textUsed,
  textLimit,
  imageUsed,
  imageLimit,
  className,
}: QuotaExhaustedProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-default bg-surface-muted/50 px-5 py-6",
        className,
      )}
    >
      <h3 className="font-serif text-lg text-text-ink">今天的生成次數用完了</h3>
      <p className="mt-2 text-sm text-text-muted">
        文字 {textUsed}/{textLimit} · 圖片 {imageUsed}/{imageLimit}
      </p>
      <p className="mt-1 text-sm text-text-muted">明天 00:00（台北時間）重置</p>
      <p className="mt-4 text-sm text-text-body">在這之前，可以：</p>
      <ul className="mt-2 list-inside list-disc text-sm text-text-body">
        <li>看看你的料理書</li>
        <li>重看 demo 食譜</li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="primary" size="sm">
          <Link href="/app/library">看料理書</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/demo/recipe">看 demo</Link>
        </Button>
      </div>
    </div>
  );
}
