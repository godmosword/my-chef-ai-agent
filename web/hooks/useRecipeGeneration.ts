"use client";

import { useCallback, useState } from "react";
import type { GenerateRecipeRequest, RecipePayload } from "@chef/shared-types";
import { fakeRecipeStream, type StreamEvent } from "@/lib/api/streaming";
import { isBrowserOnline } from "@/lib/offline/network";
import { offlineGenerationMessage } from "@/lib/offline/recipes";

function applyField(recipe: RecipePayload, ev: Extract<StreamEvent, { type: "field" }>): RecipePayload {
  const next = { ...recipe };
  switch (ev.path) {
    case "title":
      next.recipe_name = String(ev.value);
      break;
    case "cuisine":
      next.cuisine = String(ev.value);
      break;
    case "ingredients":
      next.ingredients = ev.value as RecipePayload["ingredients"];
      break;
    case "steps":
      next.steps = ev.value as RecipePayload["steps"];
      break;
    case "kitchen_talk":
      next.kitchen_talk = ev.value as RecipePayload["kitchen_talk"];
      break;
    case "shopping_list":
      next.shopping_list = ev.value as RecipePayload["shopping_list"];
      break;
    default:
      break;
  }
  return next;
}

export function useRecipeGeneration() {
  const [recipe, setRecipe] = useState<RecipePayload | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (body: GenerateRecipeRequest) => {
    if (!isBrowserOnline()) {
      setError(offlineGenerationMessage());
      return;
    }
    setStreaming(true);
    setError(null);
    setRecipe(null);
    let partial: RecipePayload = {};

    try {
      for await (const ev of fakeRecipeStream(body)) {
        if (ev.type === "meta") {
          partial = { ...partial, id: ev.id, version_no: ev.version_no };
          setRecipe({ ...partial });
        } else if (ev.type === "field") {
          partial = applyField(partial, ev);
          setRecipe({ ...partial });
        } else if (ev.type === "done") {
          setRecipe(ev.recipe);
        } else if (ev.type === "error") {
          setError(ev.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失敗");
    } finally {
      setStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRecipe(null);
    setError(null);
  }, []);

  return { recipe, streaming, error, generate, reset };
}
