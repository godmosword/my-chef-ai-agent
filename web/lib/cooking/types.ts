export type CookingStep = {
  index: number;
  text: string;
  tip?: string;
  timerSeconds?: number;
  imageHint?: string;
};

export type CookingRecipe = {
  id: string;
  title: string;
  steps: CookingStep[];
};

export type TimerPhase = "idle" | "running" | "paused" | "done";

export type ActiveTimer = {
  id: string;
  label: string;
  durationMs: number;
  remainingMs: number;
  phase: TimerPhase;
  endAtMs: number | null;
};
