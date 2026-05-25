"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/utils/cn";

export type GenerationErrorProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function GenerationError({ message, onRetry, className }: GenerationErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-ink">{message}</p>
        {onRetry ? (
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
            重試
          </Button>
        ) : null}
      </div>
    </div>
  );
}
