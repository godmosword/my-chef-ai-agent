"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { APP_NAV } from "@/lib/nav";
import { CommandBar } from "@/components/patterns/CommandBar";
import { IconButton } from "@/components/primitives/IconButton";
import { Sheet } from "@/components/primitives/Sheet";
import { MeSettingsPanel } from "@/components/settings/MeSettingsPanel";

/**
 * Desktop header — sibling of AppSidebar. The sidebar already carries the
 * brand lockup, so this bar shows the current page title for orientation
 * instead of repeating "職人料理". A gear icon opens a settings drawer so
 * users don't have to navigate to /app/me and scroll for preferences.
 */
export function AppDesktopHeader() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const active = APP_NAV.find((item) =>
    item.href === "/app"
      ? pathname === "/app"
      : pathname.startsWith(item.href),
  );
  const pageTitle = active?.label ?? "";

  return (
    <>
      <header className="hidden items-center justify-between gap-4 border-b border-border-default/60 bg-surface-default px-4 py-3 md:flex">
        <p className="font-serif text-lg text-text-ink">{pageTitle}</p>
        <div className="flex items-center gap-2">
          <CommandBar />
          <IconButton
            size="sm"
            aria-label="開啟設定"
            icon={<Settings className="size-[18px]" aria-hidden />}
            onClick={() => setSettingsOpen(true)}
          />
        </div>
      </header>

      <Sheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        side="right"
        title="設定"
      >
        <MeSettingsPanel />
      </Sheet>
    </>
  );
}
