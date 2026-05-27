"use client";

import { Button } from "@/components/primitives/Button";
import { ProgressBar } from "@/components/primitives/ProgressBar";
import type { ActiveTimer } from "@/domain/cook/types";
import { cn } from "@/lib/utils/cn";

function formatMs(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export type TimerCardProps = {
  timer: ActiveTimer;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
  flashing?: boolean;
};

export function TimerCard({
  timer,
  onPause,
  onResume,
  onClear,
  flashing,
}: TimerCardProps) {
  const progress =
    timer.durationMs > 0 ? 1 - timer.remainingMs / timer.durationMs : 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border-default bg-surface-default p-3",
        flashing && "border-danger",
        timer.phase === "done" && "border-danger",
      )}
    >
      <p className="text-sm text-text-muted">{timer.label}</p>
      <p
        className="mt-1 font-mono text-4xl tabular-nums text-text-ink"
        aria-live="polite"
      >
        {formatMs(timer.remainingMs)}
      </p>
      <ProgressBar
        value={progress * 100}
        max={100}
        className="mt-2"
        tone={timer.phase === "done" ? "danger" : "primary"}
      />
      <div className="mt-3 flex gap-2">
        {timer.phase === "running" ? (
          <Button variant="secondary" size="sm" onClick={onPause}>
            暫停
          </Button>
        ) : timer.phase === "paused" ? (
          <Button variant="secondary" size="sm" onClick={onResume}>
            繼續
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onClear}>
          清除
        </Button>
      </div>
    </div>
  );
}
