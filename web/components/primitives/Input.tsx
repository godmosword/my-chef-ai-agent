"use client";

import { cn } from "@/lib/utils/cn";

export type InputProps = {
  id?: string;
  label?: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "search";
  className?: string;
};

export function Input({
  id,
  label,
  error,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  className,
}: InputProps) {
  const inputId = id ?? label?.replace(/\s/g, "-").toLowerCase();
  return (
    <label className="block space-y-1">
      {label && (
        <span className="text-sm text-text-muted">{label}</span>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-border-default bg-surface-default px-3 py-2 text-text-ink placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
          error && "border-danger",
          className,
        )}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </label>
  );
}
