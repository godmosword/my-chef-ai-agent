"use client";

import { cn } from "@/lib/utils/cn";

export type IconButtonProps = {
  icon: React.ReactNode;
  "aria-label": string;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

export function IconButton({
  icon,
  "aria-label": ariaLabel,
  variant = "ghost",
  size = "md",
  disabled,
  onClick,
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors duration-[var(--motion-duration-normal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        size === "sm" && "size-9",
        size === "md" && "size-11",
        variant === "ghost" && "hover:bg-surface-muted",
        variant === "secondary" &&
          "border border-border-default bg-surface-default hover:bg-surface-muted",
        disabled && "opacity-50",
        className,
      )}
    >
      {icon}
    </button>
  );
}
