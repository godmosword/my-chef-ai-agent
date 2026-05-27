"use client";

import { useCallback, useState } from "react";
import {
  addFavoriteByRecipeId,
  removeFavoriteByRecipeId,
} from "@/application/api/recipes";
import { enqueueMutation } from "@/platform/sync/mutations";
import { isBrowserOnline } from "@/platform/sync/network";
import { capture } from "@/platform/analytics/events";

export function useFavoriteToggle(initialIds: Set<string>) {
  const [favoriteIds, setFavoriteIds] = useState(initialIds);
  const [pending, setPending] = useState<Set<string>>(() => new Set());

  const syncInitial = useCallback((ids: Set<string>) => {
    setFavoriteIds(ids);
  }, []);

  const toggle = useCallback(
    async (recipeId: string) => {
      if (!recipeId || pending.has(recipeId)) return;

      const wasFavorited = favoriteIds.has(recipeId);
      setPending((p) => new Set(p).add(recipeId));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });

      try {
        if (isBrowserOnline()) {
          if (wasFavorited) {
            await removeFavoriteByRecipeId(recipeId);
          } else {
            await addFavoriteByRecipeId(recipeId);
          }
        } else {
          await enqueueMutation({
            type: wasFavorited ? "favorite_remove" : "favorite_add",
            payload: { recipe_id: recipeId },
          });
        }
        if (!wasFavorited) capture("recipe_favorited", { offline: !isBrowserOnline() });
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorited) next.add(recipeId);
          else next.delete(recipeId);
          return next;
        });
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(recipeId);
          return next;
        });
      }
    },
    [favoriteIds, pending],
  );

  return { favoriteIds, toggle, syncInitial, pending };
}
