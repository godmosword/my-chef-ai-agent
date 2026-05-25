"use client";

import { useEffect, useState } from "react";
import {
  formatDateSubtitle,
  timeOfDayGreeting,
  timeOfDaySubtitle,
} from "@/lib/utils/greeting";

export function GreetingHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = mounted ? new Date() : null;

  return (
    <header className="mb-5 sm:mb-7">
      <h1 className="font-serif text-3xl leading-tight text-text-ink sm:text-5xl sm:font-medium">
        {mounted && now ? timeOfDayGreeting(now) : "今晚"}
      </h1>
      <p
        className="mt-1 text-xs text-text-muted"
        suppressHydrationWarning
      >
        {mounted && now ? (
          <>
            {formatDateSubtitle(now)} · {timeOfDaySubtitle(now)}
          </>
        ) : (
          <span className="inline-block h-4 w-40 animate-pulse rounded bg-surface-muted" />
        )}
      </p>
    </header>
  );
}
