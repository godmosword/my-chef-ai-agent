import type { RecipePayload } from "@chef/shared-types";
import type { CookingRecipe, CookingStep } from "./types";
import { parseTimerFromText } from "./parseTimerFromText";

function stepText(step: unknown): string {
  if (typeof step === "string") return step;
  if (step && typeof step === "object") {
    if ("text" in step) return String((step as { text: string }).text);
    if ("instruction" in step) return String((step as { instruction: string }).instruction);
  }
  return String(step);
}

function stepTip(step: unknown): string | undefined {
  if (step && typeof step === "object" && "tip" in step) {
    const tip = (step as { tip?: string }).tip;
    return tip?.trim() || undefined;
  }
  return undefined;
}

function stepTimerSeconds(step: unknown, text: string): number | undefined {
  if (step && typeof step === "object" && "timer_seconds" in step) {
    const s = (step as { timer_seconds?: number }).timer_seconds;
    if (typeof s === "number" && s >= 0) return s;
  }
  return parseTimerFromText(text);
}

export function normalizeCookingSteps(steps: unknown[] | undefined): CookingStep[] {
  if (!steps?.length) return [];
  return steps.map((raw, index) => {
    const text = stepText(raw);
    return {
      index,
      text,
      tip: stepTip(raw),
      timerSeconds: stepTimerSeconds(raw, text),
      imageHint:
        raw && typeof raw === "object" && "image_hint" in raw
          ? String((raw as { image_hint?: string }).image_hint)
          : undefined,
      imageUrl:
        raw && typeof raw === "object" && "image_url" in raw
          ? String((raw as { image_url?: string }).image_url || "") || undefined
          : undefined,
      imageStatus:
        raw && typeof raw === "object" && "image_status" in raw
          ? ((raw as { image_status?: CookingStep["imageStatus"] }).image_status ??
            undefined)
          : undefined,
    };
  });
}

export function recipePayloadToCooking(payload: RecipePayload): CookingRecipe {
  return {
    id: payload.id ?? "",
    title: payload.recipe_name ?? "食譜",
    steps: normalizeCookingSteps(payload.steps),
  };
}
