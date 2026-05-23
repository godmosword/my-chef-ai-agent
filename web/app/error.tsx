"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl text-text-ink">發生錯誤</h1>
      <p className="max-w-sm text-sm text-text-muted">
        請稍後再試，或返回首頁繼續使用。
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => reset()}>重試</Button>
        <Button asChild variant="secondary">
          <Link href="/app">回到首頁</Link>
        </Button>
      </div>
    </main>
  );
}
