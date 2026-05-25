"use client";

import { useCallback, useState } from "react";
import type { GenerateRecipeRequest, RecipePayload } from "@chef/shared-types";
import { fakeRecipeStream, type StreamEvent } from "@/lib/api/streaming";
import { isBrowserOnline } from "@/lib/offline/network";
import { capture, recipeGenerationCoarseProps } from "@/lib/analytics/events";

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
      setError("目前沒有網路，已收藏的食譜仍可查看。");
      return;
    }
    setStreaming(true);
    setError(null);
    setRecipe(null);
    const analyticsProps = {
      source: "today",
      ...recipeGenerationCoarseProps(body.message),
    };
    capture("recipe_generation_started", analyticsProps);
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
          if (ev.recipe.id) {
            capture("recipe_generation_succeeded", analyticsProps);
          }
        } else if (ev.type === "error") {
          const msg =
            ev.message.includes("額度") || ev.message.includes("429")
              ? "今天的文字食譜額度已用完，明日 0 點（台灣時間）重置。"
              : "這次沒有成功產生食譜，請重新試一次，或換個食材組合。";
          setError(msg);
          capture("recipe_generation_failed", {
            source: "today",
            reason: ev.message.includes("額度") ? "quota" : "error",
          });
        }
      }
    } catch (e) {
      setError("這次沒有成功產生食譜，請重新試一次，或換個食材組合。");
      capture("recipe_generation_failed", { source: "today", reason: "exception" });
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
