"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type LibraryView = "gallery" | "table";

export type ViewToggleProps = {
  view: LibraryView;
  onChange: (view: LibraryView) => void;
  className?: string;
};

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn("inline-flex rounded-lg border border-border-default p-0.5", className)}
      role="group"
      aria-label="檢視模式"
    >
      <button
        type="button"
        aria-label="圖庫檢視"
        aria-pressed={view === "gallery"}
        onClick={() => onChange("gallery")}
        className={cn(
          "rounded-md p-2",
          view === "gallery" ? "bg-brand-primary text-brand-greenText" : "text-text-muted hover:bg-surface-muted",
        )}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="列表檢視"
        aria-pressed={view === "table"}
        onClick={() => onChange("table")}
        className={cn(
          "rounded-md p-2",
          view === "table" ? "bg-brand-primary text-brand-greenText" : "text-text-muted hover:bg-surface-muted",
        )}
      >
        <List className="size-4" aria-hidden />
      </button>
    </div>
  );
}
