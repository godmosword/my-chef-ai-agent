"use client";

import { usePathname } from "next/navigation";
import { APP_NAV } from "@/lib/nav";
import { CommandBar } from "@/components/patterns/CommandBar";

/**
 * Desktop header — sibling of AppSidebar. The sidebar already carries the
 * brand lockup, so this bar shows the current page title for orientation
 * instead of repeating "職人料理".
 */
export function AppDesktopHeader() {
  const pathname = usePathname();
  const active = APP_NAV.find((item) =>
    item.href === "/app"
      ? pathname === "/app"
      : pathname.startsWith(item.href),
  );
  const pageTitle = active?.label ?? "";

  return (
    <header className="hidden items-center justify-between gap-4 border-b border-border-default/60 bg-surface-default px-4 py-3 md:flex">
      <p className="font-serif text-lg text-text-ink">{pageTitle}</p>
      <CommandBar />
    </header>
  );
}
