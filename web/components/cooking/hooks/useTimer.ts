"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimerPhase } from "@/lib/cooking/types";

export function useTimer(durationMs: number, onComplete?: () => void) {
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const endAtRef = useRef<number | null>(null);
  const durationRef = useRef(durationMs);
  const remainingRef = useRef(durationMs);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    durationRef.current = durationMs;
    if (phase === "idle") {
      setRemainingMs(durationMs);
      remainingRef.current = durationMs;
    }
  }, [durationMs, phase]);

  useEffect(() => {
    if (phase !== "running" || endAtRef.current == null) return;
    let raf = 0;
    const tick = () => {
      const endAt = endAtRef.current;
      if (endAt == null) return;
      const r = Math.max(0, endAt - performance.now());
      remainingRef.current = r;
      setRemainingMs(r);
      if (r <= 0) {
        endAtRef.current = null;
        setPhase("done");
        onCompleteRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const start = useCallback(() => {
    const d = durationRef.current;
    endAtRef.current = performance.now() + d;
    remainingRef.current = d;
    setRemainingMs(d);
    setPhase("running");
  }, []);

  const pause = useCallback(() => {
    if (endAtRef.current == null) return;
    const r = Math.max(0, endAtRef.current - performance.now());
    remainingRef.current = r;
    setRemainingMs(r);
    endAtRef.current = null;
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    endAtRef.current = performance.now() + remainingRef.current;
    setPhase("running");
  }, []);

  const reset = useCallback(() => {
    endAtRef.current = null;
    remainingRef.current = durationRef.current;
    setRemainingMs(durationRef.current);
    setPhase("idle");
  }, []);

  const progress =
    durationRef.current > 0
      ? 1 - remainingMs / durationRef.current
      : 0;

  return {
    phase,
    remainingMs,
    progress: Math.min(1, Math.max(0, progress)),
    start,
    pause,
    resume,
    reset,
    isRunning: phase === "running",
    isDone: phase === "done",
  };
}
