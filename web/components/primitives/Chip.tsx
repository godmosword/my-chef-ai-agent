"use client";

import { cn } from "@/lib/utils/cn";

export type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
};

export function Chip({
  label,
  selected,
  disabled,
  onClick,
  icon,
  className,
}: ChipProps) {
  const interactive = Boolean(onClick);
  const Comp = interactive ? "button" : "span";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={interactive ? selected : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors duration-[var(--motion-duration-normal)]",
        selected
          ? "border-brand-primary bg-accent-primaryMuted text-brand-primaryDark"
          : "border-border-default bg-surface-default text-text-body",
        interactive && !disabled && "hover:bg-surface-muted",
        disabled && "opacity-50",
        className,
      )}
    >
      {icon}
      {label}
    </Comp>
  );
}
