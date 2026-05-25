"use client";

import { QUICK_CHIPS, type QuickChip } from "@/lib/copy/quick-chips";
import { cn } from "@/lib/utils/cn";

export type QuickChipsProps = {
  selected: Set<string>;
  onToggle: (chip: QuickChip) => void;
  disabled?: boolean;
  className?: string;
};

export function QuickChips({ selected, onToggle, disabled, className }: QuickChipsProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 scrollbar-none md:flex-wrap md:overflow-visible",
        className,
      )}
      role="group"
      aria-label="快速提示"
    >
      {QUICK_CHIPS.map((chip) => {
        const active = selected.has(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            data-chip-id={chip.id}
            disabled={disabled}
            onClick={() => onToggle(chip)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-all duration-100",
              "active:scale-95 motion-reduce:transform-none",
              active
                ? "border-accent-200 bg-accent-100 text-accent-700"
                : "border-fg-tertiary/30 bg-transparent text-fg-secondary hover:border-fg-secondary hover:bg-bg-raised",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
