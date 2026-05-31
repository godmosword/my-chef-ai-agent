"use client";

import { useEffect, useRef, useState } from "react";
import { type HeroStatus, HeroStatusResponseSchema } from "@chef/shared-types";
import { parseApiResponse } from "@/lib/api-client/client";
import { capture } from "@/platform/analytics/events";

const MAX_POLLS = 24;

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
  const trackedStartedRef = useRef(false);
  const trackedFinishedRef = useRef(false);

  useEffect(() => {
    setStatus(initialStatus ?? "skipped");
    setUrl(initialUrl);
    pollsRef.current = 0;
    trackedStartedRef.current = false;
    trackedFinishedRef.current = false;
  }, [recipeId, initialStatus, initialUrl]);

  useEffect(() => {
    if (!enabled || !recipeId) return;
    if (status !== "pending" && status !== "generating") return;
    if (!trackedStartedRef.current) {
      trackedStartedRef.current = true;
      capture("hero_image_generation_started");
    }

    let cancelled = false;
    let delay = 1500;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (cancelled || pollsRef.current >= MAX_POLLS) return;
      pollsRef.current += 1;

      try {
        const res = await fetch(`/api/recipes/${recipeId}/hero-status`);
        if (!res.ok || cancelled) return;
        const data = await parseApiResponse(res, HeroStatusResponseSchema);
        if (cancelled || !data.ok) return;

        setStatus(data.hero_status);
        setUrl(data.hero_url);
        setError(data.hero_error);
        if (
          !trackedFinishedRef.current &&
          data.hero_status === "ready" &&
          data.hero_error &&
          data.hero_error !== "hero_auto_disabled"
        ) {
          trackedFinishedRef.current = true;
          capture("hero_image_generation_failed", { reason: "error" });
        }
        if (!trackedFinishedRef.current && data.hero_status === "ready") {
          trackedFinishedRef.current = true;
          capture("hero_image_generation_succeeded");
        }
        if (!trackedFinishedRef.current && data.hero_status === "failed") {
          trackedFinishedRef.current = true;
          capture("hero_image_generation_failed", {
            reason: data.hero_error === "image_quota_exceeded" ? "quota" : "error",
          });
        }

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
