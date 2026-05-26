"use client";

import { useEffect, useState } from "react";

/** True once the hero sentinel has scrolled out of view (mobile sticky CTA). */
export function usePastHeroSticky(sentinelRef: React.RefObject<HTMLElement | null>) {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) setPastHero(!entry.isIntersecting);
      },
      { root: null, threshold: 0, rootMargin: "0px 0px -1px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelRef]);

  return pastHero;
}
