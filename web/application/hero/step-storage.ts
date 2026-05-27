/** Normalize recipe steps to objects so we can attach image_url / image_status. */

export type StoredStep = {
  text: string;
  tip?: string;
  timer_seconds?: number;
  image_hint?: string;
  image_url?: string;
  image_status?: "pending" | "generating" | "ready" | "failed" | "skipped";
  image_error?: string;
};

export function stepText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if ("text" in raw) return String((raw as { text: string }).text);
    if ("instruction" in raw) {
      return String((raw as { instruction: string }).instruction);
    }
  }
  return String(raw ?? "");
}

export function ensureStoredSteps(steps: unknown[] | undefined): StoredStep[] {
  if (!steps?.length) return [];
  return steps.map((raw) => {
    if (raw && typeof raw === "object" && "text" in raw) {
      const o = raw as StoredStep;
      return {
        ...o,
        text: stepText(o),
        image_status: o.image_url ? "ready" : (o.image_status ?? "pending"),
      };
    }
    return { text: stepText(raw), image_status: "pending" as const };
  });
}

export function patchStoredStep(
  steps: StoredStep[],
  index: number,
  patch: Partial<StoredStep>,
): StoredStep[] {
  return steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
}
