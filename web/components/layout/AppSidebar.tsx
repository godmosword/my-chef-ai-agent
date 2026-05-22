"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat } from "lucide-react";
import { APP_NAV } from "@/lib/nav";
import { QuotaIndicator } from "@/components/patterns/QuotaIndicator";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils/cn";

export function AppSidebar() {
  const pathname = usePathname();
  const { toast } = useToast();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border-default bg-surface-default md:flex">
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-4">
        <ChefHat className="size-6 text-brand-primary" aria-hidden />
        <span className="font-serif text-lg text-text-ink">職人料理</span>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="主選單">
        {APP_NAV.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href) && item.href !== "/app";
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <button
                key={item.href}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted opacity-60"
                onClick={() =>
                  toast({
                    title: item.label,
                    description: item.soonMessage ?? "即將推出",
                  })
                }
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-primaryLight font-medium text-text-ink"
                  : "text-text-body hover:bg-surface-muted",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border-default p-4">
        <QuotaIndicator />
      </div>
    </aside>
  );
}
