import type { UserSettings } from "@chef/shared-types";

const STORAGE_KEY = "chef_user_settings";

export function loadLocalSettings(): Partial<UserSettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<UserSettings>) : null;
  } catch {
    return null;
  }
}

export function saveLocalSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applySettingsToDocument(settings: UserSettings): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--font-scale",
    String(settings.font_scale / 100),
  );
  document.documentElement.lang =
    settings.locale === "zh-Hant-TW" ? "zh-Hant" : settings.locale;
}
