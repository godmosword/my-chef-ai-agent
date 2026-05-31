import { StepSchema } from "@chef/shared-types";
import { z } from "zod";

/**
 * Persisted recipe step (DB / hero pipeline).
 * Object form of {@link StepSchema} with optional hero-image fields.
 * String steps from LLM output are normalized to `{ text }` via {@link ensureStoredSteps}.
 */
const StoredStepImageStatusSchema = z.enum([
  "pending",
  "generating",
  "ready",
  "failed",
  "skipped",
]);

export const StoredStepSchema = z.object({
  text: z.string().min(1),
  tip: z.string().optional(),
  timer_seconds: z.number().int().nonnegative().optional(),
  image_hint: z.string().optional(),
  image_url: z.string().optional(),
  image_status: StoredStepImageStatusSchema.optional(),
  image_error: z.string().optional(),
});

export type StoredStep = z.infer<typeof StoredStepSchema>;

/** Validates object-shaped steps against shared StepSchema fields + storage extensions. */
export function parseStoredStep(raw: unknown): StoredStep | null {
  if (typeof raw === "string") {
    const step = StepSchema.safeParse(raw);
    if (!step.success || typeof step.data !== "string") return null;
    return { text: step.data, image_status: "pending" };
  }
  if (!raw || typeof raw !== "object") return null;
  const base = StepSchema.safeParse(raw);
  if (!base.success) return null;
  const text =
    typeof base.data === "string"
      ? base.data
      : base.data.text ?? stepText(raw);
  const parsed = StoredStepSchema.safeParse({ ...raw, text });
  return parsed.success ? parsed.data : null;
}

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
    const parsed = parseStoredStep(raw);
    if (parsed) {
      return {
        ...parsed,
        text: stepText(parsed),
        image_status: parsed.image_url
          ? "ready"
          : (parsed.image_status ?? "pending"),
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
