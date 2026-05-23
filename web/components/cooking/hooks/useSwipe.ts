"use client";

import { useEffect, useRef } from "react";

export function useSwipe(onSwipe: (dir: "next" | "prev") => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? 0;
    };
    const onEnd = (e: TouchEvent) => {
      const x = e.changedTouches[0]?.clientX ?? 0;
      const dx = x - startX;
      if (Math.abs(dx) > 100) {
        onSwipeRef.current(dx > 0 ? "prev" : "next");
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  return ref;
}
