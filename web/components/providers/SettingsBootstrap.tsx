"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { fetchUserSettings } from "@/lib/api/settings";
import {
  applySettingsToDocument,
  loadLocalSettings,
  saveLocalSettings,
} from "@/lib/settings/apply";
import { syncAnalyticsOptIn } from "@/components/analytics/PostHogProvider";
import type { UserSettings } from "@chef/shared-types";

function mergeSettings(
  remote: UserSettings | null,
  local: Partial<UserSettings> | null,
): UserSettings {
  const base: UserSettings = {
    theme: "system",
    font_scale: 100,
    locale: "zh-Hant-TW",
    voice_enabled: false,
    analytics_opt: true,
    hero_auto_generate: true,
  };
  return { ...base, ...local, ...remote };
}

export function SettingsBootstrap() {
  const { setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = loadLocalSettings();
      if (local) {
        applySettingsToDocument(mergeSettings(null, local));
        if (local.theme) setTheme(local.theme);
        if (local.analytics_opt != null) syncAnalyticsOptIn(local.analytics_opt);
      }

      try {
        const res = await fetchUserSettings();
        if (cancelled) return;
        const merged = mergeSettings(res.settings, local);
        applySettingsToDocument(merged);
        saveLocalSettings(merged);
        setTheme(merged.theme);
        syncAnalyticsOptIn(merged.analytics_opt);
      } catch {
        /* offline or unauthenticated */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  return null;
}
