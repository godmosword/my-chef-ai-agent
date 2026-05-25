"use client";

import { useEffect, useRef, useState } from "react";

const FADE_OUT_MS = 200;
const GAP_MS = 150;
const FADE_IN_MS = 250;
const RESUME_DELAY_MS = 1500;

export function usePlaceholderRotator(
  placeholders: readonly string[],
  isPaused: boolean,
  intervalMs = 4000,
) {
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPausedRef = useRef(isPaused);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!wasPausedRef.current && isPaused) {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    }
    if (wasPausedRef.current && !isPaused) {
      resumeTimerRef.current = setTimeout(() => {
        setOpacity(1);
      }, RESUME_DELAY_MS);
    }
    wasPausedRef.current = isPaused;
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [isPaused]);

  useEffect(() => {
    if (isPaused || placeholders.length === 0) return;

    const tick = () => {
      if (reducedMotion) {
        setIndex((i) => (i + 1) % placeholders.length);
        return;
      }
      setOpacity(0);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % placeholders.length);
        window.setTimeout(() => setOpacity(1), GAP_MS);
      }, FADE_OUT_MS);
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [isPaused, intervalMs, placeholders.length, reducedMotion]);

  return {
    text: placeholders[index] ?? placeholders[0] ?? "",
    opacity: reducedMotion ? 1 : opacity,
  };
}
