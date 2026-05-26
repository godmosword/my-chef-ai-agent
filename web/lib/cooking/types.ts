type StepImageStatus =
  | "pending"
  | "generating"
  | "ready"
  | "failed"
  | "skipped";

export type CookingStep = {
  index: number;
  text: string;
  tip?: string;
  timerSeconds?: number;
  imageHint?: string;
  imageUrl?: string;
  imageStatus?: StepImageStatus;
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
