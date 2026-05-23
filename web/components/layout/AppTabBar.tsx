"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";

const TAB_ITEMS = APP_NAV.filter((n) =>
  ["/app", "/app/library", "/app/me"].includes(n.href),
);

export function AppTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex min-h-[3.5rem] border-t border-border-default bg-surface-default pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="行動導覽"
    >
      {TAB_ITEMS.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        if (!item.enabled) return null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-xs transition-colors",
              active
                ? "font-medium text-brand-primary"
                : "text-text-muted hover:text-text-body",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
