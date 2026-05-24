"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";

export default function LibraryErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[library] render error:", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-2xl text-text-ink">我的食譜</h1>
      </header>
      <div className="rounded-lg border border-border-default bg-surface-default p-6">
        <p className="font-serif text-lg text-text-ink">載入時遇到問題</p>
        <p className="mt-2 text-sm text-text-muted">
          {error.message || "請稍後再試或重新整理頁面。"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={reset}>重試</Button>
          <Button asChild variant="secondary">
            <Link href="/app">回到今晚吃什麼</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
