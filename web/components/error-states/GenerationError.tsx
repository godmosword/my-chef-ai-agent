"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/utils/cn";

export type GenerationErrorProps = {
  message: string;
  onRetry?: () => void;
  onClearInput?: () => void;
  className?: string;
};

export function GenerationError({
  message,
  onRetry,
  onClearInput,
  className,
}: GenerationErrorProps) {
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
        <div className="mt-2 flex flex-wrap gap-2">
          {onRetry ? (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              重試
            </Button>
          ) : null}
          {onClearInput ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClearInput}>
              重新輸入
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
