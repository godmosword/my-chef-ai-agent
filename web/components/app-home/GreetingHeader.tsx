"use client";

import { useEffect, useState } from "react";
import {
  formatDateSubtitle,
  getGreetingLine,
  isRushHour,
  rushHourHint,
} from "@/lib/utils/greeting";
export function GreetingHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = mounted ? new Date() : null;
  const rush = now ? isRushHour(now) : false;

  return (
    <header className="pt-8 pb-6">
      <h1 className="text-3xl font-semibold tracking-tight text-text-ink sm:text-4xl">
        今晚想吃什麼？
      </h1>
      <p className="mt-1 text-sm text-fg-secondary" suppressHydrationWarning>
        {mounted && now ? (
          <>
            {formatDateSubtitle(now)} · {getGreetingLine(now)}
            {rush ? (
              <span className="mt-1 block text-brand-primaryDark">
                ⏰ {rushHourHint()}
              </span>
            ) : null}
          </>
        ) : (
          <span className="inline-block h-4 w-48 animate-pulse rounded bg-surface-muted" />
        )}
      </p>
    </header>
  );
}
