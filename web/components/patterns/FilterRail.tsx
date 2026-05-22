"use client";

import { Chip } from "@/components/primitives/Chip";
import { cn } from "@/lib/utils/cn";

export type FilterOption = {
  id: string;
  label: string;
  count?: number;
};

export type FilterRailProps = {
  options: FilterOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

/** TODO: cuisine counts from API when backend exposes aggregates */
export function FilterRail({ options, selectedId, onSelect, className }: FilterRailProps) {
  return (
    <div
      className={cn("flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]", className)}
      role="tablist"
      aria-label="篩選"
    >
      <Chip
        label="全部"
        selected={selectedId === null}
        onClick={() => onSelect(null)}
      />
      {options.map((opt) => (
        <Chip
          key={opt.id}
          label={opt.count != null ? `${opt.label} (${opt.count})` : opt.label}
          selected={selectedId === opt.id}
          onClick={() => onSelect(opt.id)}
        />
      ))}
    </div>
  );
}
