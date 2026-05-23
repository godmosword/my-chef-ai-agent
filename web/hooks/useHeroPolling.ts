"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroStatus } from "@chef/shared-types";

const MAX_POLLS = 24;

type HeroStatusResponse = {
  ok: boolean;
  hero_status: HeroStatus;
  hero_url: string | null;
  hero_error: string | null;
};

export function useHeroPolling(
  recipeId: string | undefined,
  initialStatus: HeroStatus | string | undefined,
  initialUrl?: string | null,
  enabled = true,
): { status: HeroStatus | string; url: string | null | undefined; error: string | null } {
  const [status, setStatus] = useState(initialStatus ?? "skipped");
  const [url, setUrl] = useState<string | null | undefined>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const pollsRef = useRef(0);

  useEffect(() => {
    setStatus(initialStatus ?? "skipped");
    setUrl(initialUrl);
    pollsRef.current = 0;
  }, [recipeId, initialStatus, initialUrl]);

  useEffect(() => {
    if (!enabled || !recipeId) return;
    if (status !== "pending" && status !== "generating") return;

    let cancelled = false;
    let delay = 1500;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled || pollsRef.current >= MAX_POLLS) return;
      pollsRef.current += 1;

      try {
        const res = await fetch(`/api/recipes/${recipeId}/hero-status`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as HeroStatusResponse;
        if (cancelled || !data.ok) return;

        setStatus(data.hero_status);
        setUrl(data.hero_url);
        setError(data.hero_error);

        if (data.hero_status === "pending" || data.hero_status === "generating") {
          delay = Math.min(delay * 1.4, 8000);
          timer = setTimeout(tick, delay);
        }
      } catch {
        if (!cancelled && pollsRef.current < MAX_POLLS) {
          timer = setTimeout(tick, delay);
        }
      }
    };

    timer = setTimeout(tick, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [recipeId, status, enabled]);

  return { status, url, error };
}
