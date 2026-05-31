import type {
  DeleteAccountResponse,
  SettingsResponse,
  UpdateSettingsResponse,
  UpdateUserSettings,
} from "@chef/shared-types";
import {
  DeleteAccountResponseSchema,
  SettingsResponseSchema,
  UpdateSettingsResponseSchema,
} from "@chef/shared-types";
import { apiFetch } from "./client";

export async function fetchUserSettings(): Promise<SettingsResponse> {
  return apiFetch("/api/me/settings", undefined, SettingsResponseSchema);
}

export async function updateUserSettings(
  patch: UpdateUserSettings,
): Promise<UpdateSettingsResponse> {
  return apiFetch("/api/me/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }, UpdateSettingsResponseSchema);
}

export async function deleteAccount(): Promise<DeleteAccountResponse> {
  return apiFetch("/api/me", { method: "DELETE" }, DeleteAccountResponseSchema);
}

export type { SettingsResponse };
