import { apiFetch } from "./client";

export interface ProfileResponse {
  ok: true;
  db_configured: boolean;
  recipe_count: number;
  shared_count: number;
  favorites_count: number;
  current_streak: number;
  longest_streak: number;
  first_recipe_at: string | null;
  last_recipe_at: string | null;
}

export async function fetchUserProfile(): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>("/api/me/profile");
}
