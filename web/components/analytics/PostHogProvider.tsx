"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FLAGS } from "@/platform/config/flags";
import { setAnalyticsEnabled } from "@/platform/analytics/track";
import { capture, sanitizeAnalyticsPath } from "@/platform/analytics/events";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!FLAGS.analytics) return;

    let cancelled = false;

    (async () => {
      try {
        const { default: posthog } = await import("posthog-js");
        if (cancelled) return;
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
        const host =
          process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
          "https://us.i.posthog.com";
        if (!key) return;

        posthog.init(key, {
          api_host: host,
          person_profiles: "identified_only",
          capture_pageview: false,
          disable_session_recording: true,
        });

        (window as Window & { posthog?: typeof posthog }).posthog = posthog;
      } catch {
        /* optional dependency */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!FLAGS.analytics || !pathname) return;
    capture("page_viewed", { path: sanitizeAnalyticsPath(pathname) });
  }, [pathname]);

  return <>{children}</>;
}

export function syncAnalyticsOptIn(optIn: boolean): void {
  setAnalyticsEnabled(optIn);
  const ph = (window as Window & { posthog?: { opt_out_capturing?: () => void; opt_in_capturing?: () => void } })
    .posthog;
  if (!ph) return;
  if (optIn) ph.opt_in_capturing?.();
  else ph.opt_out_capturing?.();
}
