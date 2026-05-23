"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import type { ActiveTimer, CookingStep, TimerPhase } from "@/lib/cooking/types";
import { endAtFromRemaining, remainingMsFromEndAt } from "@/lib/cooking/timerMath";
import { TimerCard } from "./TimerCard";
import { Button } from "@/components/primitives/Button";
import { useToast } from "@/components/providers/ToastProvider";

const MAX_TIMERS = 3;

function newTimer(label: string, durationMs: number): ActiveTimer {
  return {
    id: crypto.randomUUID(),
    label,
    durationMs,
    remainingMs: durationMs,
    phase: "idle",
    endAtMs: null,
  };
}

export type TimerSlotProps = {
  currentStep: CookingStep;
  onTimerDone: (label: string) => void;
  onChime: () => void;
  onVibrate: () => void;
  flashClass: boolean;
  onDismissFlash: () => void;
};

export function TimerSlot({
  currentStep,
  onTimerDone,
  onChime,
  onVibrate,
  flashClass,
  onDismissFlash,
}: TimerSlotProps) {
  const { toast } = useToast();
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const timersRef = useRef(timers);
  timersRef.current = timers;
  const doneFiredRef = useRef<Set<string>>(new Set());

  const startTimer = useCallback(
    (label: string, durationMs: number) => {
      if (timersRef.current.length >= MAX_TIMERS) {
        toast({ title: "最多同時 3 個計時器", variant: "error" });
        return;
      }
      const t = newTimer(label, durationMs);
      t.phase = "running";
      t.endAtMs = endAtFromRemaining(t.durationMs, performance.now());
      setTimers((prev) => [...prev, t]);
    },
    [toast],
  );

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      setTimers((prev) =>
        prev.map((t) => {
          if (t.phase !== "running" || t.endAtMs == null) return t;
          const remaining = remainingMsFromEndAt(t.endAtMs, now);
          if (remaining <= 0) {
            if (!doneFiredRef.current.has(t.id)) {
              doneFiredRef.current.add(t.id);
              onChime();
              onVibrate();
              onTimerDone(t.label);
            }
            return { ...t, remainingMs: 0, phase: "done" as TimerPhase, endAtMs: null };
          }
          return { ...t, remainingMs: remaining };
        }),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onChime, onTimerDone, onVibrate]);

  const pause = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.phase !== "running" || t.endAtMs == null) return t;
        return {
          ...t,
          remainingMs: remainingMsFromEndAt(t.endAtMs, performance.now()),
          endAtMs: null,
          phase: "paused",
        };
      }),
    );
  };

  const resume = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.phase !== "paused") return t;
        return {
          ...t,
          endAtMs: endAtFromRemaining(t.remainingMs, performance.now()),
          phase: "running",
        };
      }),
    );
  };

  const clear = (id: string) => {
    doneFiredRef.current.delete(id);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const canStartStepTimer = Boolean(currentStep.timerSeconds);

  if (timers.length === 0 && !canStartStepTimer) return null;

  return (
    <div
      className={`shrink-0 border-t border-border-default px-4 py-3 ${flashClass ? "" : ""}`}
    >
      {flashClass && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-danger bg-surface-muted px-3 py-2 text-sm text-danger">
          <span>計時器時間到！</span>
          <Button variant="ghost" size="sm" onClick={onDismissFlash}>
            我知道了
          </Button>
        </div>
      )}
      {canStartStepTimer && (
        <Button
          variant="primary"
          size="sm"
          className="mb-3 w-full bg-brand-primary text-brand-greenText hover:bg-brand-primaryDark"
          onClick={() =>
            startTimer(`步驟 ${currentStep.index + 1}`, (currentStep.timerSeconds ?? 0) * 1000)
          }
        >
          <Clock className="size-4" aria-hidden />
          開始此步計時（{Math.round((currentStep.timerSeconds ?? 0) / 60)} 分）
        </Button>
      )}
      {timers.length > 0 && (
        <div className="flex flex-col gap-3 md:flex-row">
          {timers.map((t) => (
            <TimerCard
              key={t.id}
              timer={t}
              flashing={flashClass && t.phase === "done"}
              onPause={() => pause(t.id)}
              onResume={() => resume(t.id)}
              onClear={() => clear(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
