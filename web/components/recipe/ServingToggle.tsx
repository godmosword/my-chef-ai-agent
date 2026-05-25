"use client";

import { cn } from "@/lib/utils/cn";

export type ServingToggleProps = {
  value: number;
  options: readonly number[];
  onChange: (value: number) => void;
  "aria-label"?: string;
};

export function ServingToggle({
  value,
  options,
  onChange,
  "aria-label": ariaLabel = "調整份量",
}: ServingToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg bg-bg-raised p-1"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm transition-all duration-100",
            value === opt
              ? "bg-base font-medium text-fg-primary shadow-sm"
              : "text-fg-secondary hover:text-fg-primary",
          )}
        >
          {opt}x
        </button>
      ))}
    </div>
  );
}
