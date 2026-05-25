"use client";

import Link from "next/link";
import { Button } from "@/components/primitives/Button";

export function LibraryEmpty() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      <span className="text-6xl" aria-hidden>
        🍳
      </span>
      <h2 className="mt-4 text-xl font-medium text-text-ink">還沒有食譜</h2>
      <p className="mt-2 text-sm text-fg-secondary">從今晚生成你的第一道菜</p>
      <Button asChild className="mt-6" variant="primary">
        <Link href="/app">去今晚生成</Link>
      </Button>
    </div>
  );
}
