import { FLAGS } from "@/lib/flags";

type TrackProps = Record<string, string | number | boolean | undefined>;

let analyticsEnabled = true;

export function setAnalyticsEnabled(enabled: boolean): void {
  analyticsEnabled = enabled;
}

export function track(event: string, properties?: TrackProps): void {
  if (typeof window === "undefined" || !FLAGS.analytics || !analyticsEnabled) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return;

  const ph = (
    window as Window & {
      posthog?: { capture: (e: string, p?: TrackProps) => void };
    }
  ).posthog;

  if (ph?.capture) {
    ph.capture(event, properties);
  }
}
