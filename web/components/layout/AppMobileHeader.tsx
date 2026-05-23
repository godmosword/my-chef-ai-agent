"use client";

import { usePathname } from "next/navigation";
import { CommandBar } from "@/components/patterns/CommandBar";

/** Mobile top chrome: safe-area + optional title (hidden on Today — page has GreetingHeader). */
export function AppMobileHeader() {
  const pathname = usePathname();
  const isToday = pathname === "/app";

  if (isToday) {
    return (
      <div
        className="sticky top-0 z-30 shrink-0 bg-canvas pt-[env(safe-area-inset-top)] md:hidden"
        aria-hidden
      />
    );
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border-default bg-surface-default/95 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur md:hidden"
    >
      <p className="font-serif text-lg text-text-ink">職人料理</p>
      <CommandBar />
    </header>
  );
}
