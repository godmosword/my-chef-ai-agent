/**
 * Per-recipe ingredient/step check progress, persisted to localStorage.
 * Expires after 24 hours — assumption: a single cooking session is
 * the unit; revisiting next week starts fresh.
 */

const TTL_MS = 24 * 60 * 60 * 1000;

type Progress = {
  ingredients: number[];
  steps: number[];
  updatedAt: number;
};

function storageKey(recipeId: string): string {
  return `recipe-${recipeId}-progress`;
}

export function readProgress(recipeId: string): Progress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(storageKey(recipeId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Progress;
    if (Date.now() - parsed.updatedAt > TTL_MS) {
      window.localStorage.removeItem(storageKey(recipeId));
      return empty();
    }
    return {
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return empty();
  }
}

export function writeProgress(recipeId: string, progress: Omit<Progress, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(recipeId),
      JSON.stringify({ ...progress, updatedAt: Date.now() }),
    );
  } catch {
    /* quota exceeded — fail silent */
  }
}

function empty(): Progress {
  return { ingredients: [], steps: [], updatedAt: Date.now() };
}
