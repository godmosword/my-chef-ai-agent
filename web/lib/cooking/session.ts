import type { ActiveTimer } from "./types";

export type CookingSessionSnapshot = {
  currentStep: number;
  voiceEnabled: boolean;
  timers: ActiveTimer[];
  savedAt: number;
};

const key = (recipeId: string) => `cooking_session_${recipeId}`;

export function loadCookingSession(recipeId: string): CookingSessionSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(recipeId));
    if (!raw) return null;
    return JSON.parse(raw) as CookingSessionSnapshot;
  } catch {
    return null;
  }
}

export function saveCookingSession(recipeId: string, data: CookingSessionSnapshot): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(key(recipeId), JSON.stringify(data));
}

export function clearCookingSession(recipeId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(key(recipeId));
}
