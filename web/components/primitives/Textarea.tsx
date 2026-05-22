"use client";

import { cn } from "@/lib/utils/cn";

export type TextareaProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export function Textarea({
  value,
  onChange,
  placeholder,
  disabled,
  minRows = 4,
  maxRows = 8,
  onKeyDown,
  className,
  id,
  "aria-label": ariaLabel,
}: TextareaProps) {
  return (
    <textarea
      id={id}
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      rows={minRows}
      onKeyDown={onKeyDown}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full resize-y rounded-lg border border-border-default bg-surface-default px-3 py-3 text-text-ink placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        `min-h-[calc(var(--font-size-base)*${minRows}*1.6)] max-h-[calc(var(--font-size-base)*${maxRows}*1.6)]`,
        className,
      )}
    />
  );
}
