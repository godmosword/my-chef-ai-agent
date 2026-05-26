"use client";

import { useCallback, useState } from "react";
import type { GenerateRecipeRequest, RecipePayload } from "@chef/shared-types";
import { fakeRecipeStream, type StreamEvent } from "@/lib/api/streaming";
import { isBrowserOnline } from "@/lib/offline/network";
import { capture, recipeGenerationCoarseProps } from "@/lib/analytics/events";
import {
  classifyGenerationError,
  classifyStreamErrorMessage,
  validatePromptLength,
} from "@/lib/api/error-handler";
import type { GenerationErrorView } from "@/lib/api/error-types";

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
  const [errorView, setErrorView] = useState<GenerationErrorView | null>(null);

  const generate = useCallback(async (body: GenerateRecipeRequest) => {
    const short = validatePromptLength(body.message);
    if (short) {
      setErrorView(short);
      setError(short.message);
      return;
    }
    if (!isBrowserOnline()) {
      const view = classifyGenerationError(new Error("offline"));
      setErrorView(view);
      setError(view.message);
      return;
    }
    setStreaming(true);
    setError(null);
    setErrorView(null);
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
            capture("recipe_generation_succeeded", {
              ...analyticsProps,
              has_decision_card: true,
            });
          }
        } else if (ev.type === "error") {
          const view = classifyStreamErrorMessage(ev.message);
          setErrorView(view);
          setError(view.message);
          capture("recipe_generation_failed", {
            source: "today",
            reason: view.kind,
          });
        }
      }
    } catch (e) {
      const view = classifyGenerationError(e);
      setErrorView(view);
      setError(view.message);
      capture("recipe_generation_failed", {
        source: "today",
        reason: view.kind,
      });
    } finally {
      setStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRecipe(null);
    setError(null);
    setErrorView(null);
  }, []);

  return { recipe, streaming, error, errorView, generate, reset };
}
