"use client";

import { useEffect } from "react";
import { fetchUserSettings } from "@/application/api/settings";
import {
  applySettingsToDocument,
  loadLocalSettings,
  saveLocalSettings,
} from "@/application/settings/apply";
import { syncAnalyticsOptIn } from "@/components/analytics/PostHogProvider";
import { applyTheme, persistTheme, readLocalTheme, type Theme } from "@/lib/theme";
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

function syncVoiceDefault(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("cooking_voice_enabled") == null) {
    localStorage.setItem("cooking_voice_enabled", enabled ? "1" : "0");
  }
}

export function SettingsBootstrap() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = loadLocalSettings();
      if (local) {
        applySettingsToDocument(mergeSettings(null, local));
        if (local.analytics_opt != null) syncAnalyticsOptIn(local.analytics_opt);
        if (local.voice_enabled != null) syncVoiceDefault(local.voice_enabled);
      }

      try {
        const res = await fetchUserSettings();
        if (cancelled) return;
        const merged = mergeSettings(res.settings, local);
        applySettingsToDocument(merged);
        saveLocalSettings(merged);
        syncAnalyticsOptIn(merged.analytics_opt);
        syncVoiceDefault(merged.voice_enabled);

        // Sync remote theme into the manual-theme localStorage key + DOM only
        // if it actually differs from what's already there — keeps SSR / inline
        // bootstrap script as the single source of truth on first paint.
        const remoteTheme = merged.theme as Theme;
        if (remoteTheme !== readLocalTheme()) {
          persistTheme(remoteTheme);
          applyTheme(remoteTheme);
        }
      } catch {
        /* offline or unauthenticated */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
