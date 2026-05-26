"use client";

import Link from "next/link";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/utils/cn";

export type StickyCookCTAProps = {
  cookHref: string;
  visible: boolean;
  className?: string;
};

export function StickyCookCTA({ cookHref, visible, className }: StickyCookCTAProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-surface-default/95 p-3 pb-safe backdrop-blur transition-transform duration-200 ease-out md:hidden",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
        className,
      )}
      aria-hidden={!visible}
    >
      <Button asChild size="lg" className="w-full" tabIndex={visible ? 0 : -1}>
        <Link href={cookHref}>
          <ChefHat className="size-5" aria-hidden />
          進入烹飪模式 →
        </Link>
      </Button>
    </div>
  );
}

export type DesktopCookCTAProps = {
  cookHref: string;
  className?: string;
};

export function DesktopCookCTA({ cookHref, className }: DesktopCookCTAProps) {
  return (
    <div className={cn("hidden md:block", className)}>
      <Button asChild size="lg" className="min-w-[280px]">
        <Link href={cookHref}>
          <ChefHat className="size-5" aria-hidden />
          進入烹飪模式 →
        </Link>
      </Button>
    </div>
  );
}
