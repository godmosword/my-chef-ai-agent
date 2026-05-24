"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Flame, Sparkles } from "lucide-react";
import { APP_NAV, type NavItem, type NavSection } from "@/lib/nav";
import { fetchUserProfile, type ProfileResponse } from "@/lib/api/profile";
import { useDisplayName } from "@/lib/profile/display-name";
import { cookedToday } from "@/lib/profile/title";
import { Avatar } from "@/components/primitives/Avatar";
import { QuotaIndicator } from "@/components/patterns/QuotaIndicator";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils/cn";

const SECTION_ORDER: NavSection[] = ["下廚", "規劃", "帳號"];

export function AppSidebar() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchUserProfile();
        if (!cancelled) setProfile(res);
      } catch {
        /* unauthenticated or offline — sidebar still renders without badges */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<NavSection, NavItem[]>();
    for (const s of SECTION_ORDER) map.set(s, []);
    for (const item of APP_NAV) map.get(item.section)?.push(item);
    return map;
  }, []);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const meItem = APP_NAV.find((n) => n.href === "/app/me");

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border-default bg-surface-default md:flex">
      <Link
        href="/app"
        className="flex items-center gap-2.5 border-b border-border-default/60 px-4 py-5"
      >
        <ChefHat className="size-6 text-brand-green" aria-hidden />
        <div className="min-w-0">
          <p className="truncate font-serif text-lg leading-tight text-text-ink">
            職人料理
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand-green">
            你的私人料理大腦
          </p>
        </div>
      </Link>

      <nav className="flex-1 space-y-3 px-2 py-3" aria-label="主選單">
        {SECTION_ORDER.filter((s) => s !== "帳號").map((section) => {
          const items = grouped.get(section) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={section} className="space-y-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                {section}
              </p>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.href}>
                    <SidebarItem
                      item={item}
                      active={isActive(item.href)}
                      profile={profile}
                      onSoonClick={() =>
                        toast({
                          title: item.label,
                          description: item.soonMessage ?? "即將推出",
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border-default/60 p-3">
        {meItem && (
          <MeProfileChip
            item={meItem}
            active={isActive(meItem.href)}
            profile={profile}
          />
        )}
        <QuotaIndicator />
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  profile: ProfileResponse | null;
  onSoonClick: () => void;
}

function SidebarItem({ item, active, profile, onSoonClick }: SidebarItemProps) {
  const Icon = item.icon;

  if (!item.enabled) {
    return (
      <button
        type="button"
        onClick={onSoonClick}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-text-muted",
          "transition-colors hover:bg-surface-muted/60",
        )}
      >
        <Icon className="size-[18px] text-text-muted/70" aria-hidden />
        <span className="flex-1 text-left">{item.label}</span>
        <span
          aria-hidden
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-default px-1.5 py-px text-[10px] font-medium text-text-muted"
        >
          <Sparkles className="size-3" />
          Soon
        </span>
      </button>
    );
  }

  // Active item gets an extra 4px left bar — strongest "you are here" signal.
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-brand-primaryLight font-medium text-brand-primaryDark"
          : "text-text-body hover:bg-surface-muted hover:text-text-ink",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-brand-primary"
        />
      )}
      <Icon
        className={cn(
          "size-[18px]",
          active ? "text-brand-primary" : "text-text-muted",
        )}
        aria-hidden
        {...(active && item.href === "/app" ? { fill: "currentColor" } : {})}
      />
      <span className="flex-1">{item.label}</span>
      <ItemBadge item={item} profile={profile} active={active} />
    </Link>
  );
}

function ItemBadge({
  item,
  profile,
  active,
}: {
  item: NavItem;
  profile: ProfileResponse | null;
  active: boolean;
}) {
  // Today: status dot — amber means "do something today", green means "already cooked today".
  if (item.href === "/app") {
    if (!profile) return null;
    const done = cookedToday(profile.last_recipe_at);
    return (
      <span
        aria-label={done ? "今日已下廚" : "今日尚未下廚"}
        title={done ? "今日已下廚" : "今日尚未下廚"}
        className={cn(
          "inline-block size-2 rounded-full",
          done ? "bg-brand-green" : "bg-brand-primary",
        )}
      />
    );
  }

  // Library: recipe count chip.
  if (item.href === "/app/library") {
    const count = profile?.recipe_count ?? 0;
    if (count === 0) return null;
    return (
      <span
        className={cn(
          "rounded-full px-1.5 text-[11px] tabular-nums",
          active
            ? "bg-brand-primary/15 text-brand-primaryDark"
            : "bg-surface-muted text-text-muted",
        )}
      >
        {count}
      </span>
    );
  }

  return null;
}

function MeProfileChip({
  item,
  active,
  profile,
}: {
  item: NavItem;
  active: boolean;
  profile: ProfileResponse | null;
}) {
  const streak = profile?.current_streak ?? 0;
  const subline =
    streak > 0 ? (
      <span className="inline-flex items-center gap-1">
        <Flame className="size-3 text-brand-primary" aria-hidden fill="currentColor" />
        {streak} 天連續
      </span>
    ) : (
      <span className="text-text-muted">今日下廚開始</span>
    );

  const displayName = useDisplayName();

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        active
          ? "border-brand-primary/40 bg-brand-primaryLight"
          : "border-border-default bg-surface-muted/40 hover:border-border-default hover:bg-surface-muted",
      )}
    >
      <Avatar label={displayName} size="md" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            active ? "text-brand-primaryDark" : "text-text-ink",
          )}
        >
          {displayName}
        </p>
        <p className="text-[11px] text-text-body">{subline}</p>
      </div>
    </Link>
  );
}
