import { apiFetch } from "@/lib/api/client";
import type { PublicRecipe, ShareRecipeResponse } from "@chef/shared-types";

export async function createShareLink(
  recipeId: string,
  republish = false,
): Promise<ShareRecipeResponse> {
  const res = await apiFetch<{ ok: true } & ShareRecipeResponse>(
    `/api/recipes/${recipeId}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(republish ? { republish: true } : {}),
    },
  );
  return {
    share_token: res.share_token,
    share_url: res.share_url,
    published_at: res.published_at,
  };
}

export async function revokeShareLink(recipeId: string): Promise<void> {
  await apiFetch(`/api/recipes/${recipeId}/share`, { method: "DELETE" });
}

export async function fetchPublicRecipe(
  token: string,
): Promise<PublicRecipe | null> {
  try {
    const res = await fetch(`/api/r/${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & PublicRecipe;
    if (!data.ok) return null;
    return data;
  } catch {
    return null;
  }
}

export async function recordShareView(token: string): Promise<void> {
  try {
    await fetch(`/api/r/${token}/view`, { method: "POST" });
  } catch {
    /* ignore */
  }
}

export async function likeSharedRecipe(token: string): Promise<{
  like_count: number;
  liked: boolean;
}> {
  const res = await fetch(`/api/r/${token}/like`, { method: "POST" });
  const data = await res.json();
  return data;
}

export async function unlikeSharedRecipe(token: string): Promise<{
  like_count: number;
  liked: boolean;
}> {
  const res = await fetch(`/api/r/${token}/like`, { method: "DELETE" });
  const data = await res.json();
  return data;
}
