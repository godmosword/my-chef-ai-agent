import type { ProfileResponse } from "@chef/shared-types";
import { ProfileResponseSchema } from "@chef/shared-types";
import { apiFetch } from "./client";

export async function fetchUserProfile(): Promise<ProfileResponse> {
  return apiFetch("/api/me/profile", undefined, ProfileResponseSchema);
}

export type { ProfileResponse };
