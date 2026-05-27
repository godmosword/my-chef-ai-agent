import type { UpdateUserSettings, UserSettings } from "@chef/shared-types";
import { apiFetch } from "./client";

export type SettingsResponse = {
  ok: true;
  settings: UserSettings;
  db_configured: boolean;
  recipe_count: number;
  shared_count: number;
};

export async function fetchUserSettings(): Promise<SettingsResponse> {
  return apiFetch<SettingsResponse>("/api/me/settings");
}

export async function updateUserSettings(
  patch: UpdateUserSettings,
): Promise<{ ok: true; settings: UserSettings }> {
  return apiFetch("/api/me/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteAccount(): Promise<{ ok: true; deleted: boolean }> {
  return apiFetch("/api/me", { method: "DELETE" });
}
