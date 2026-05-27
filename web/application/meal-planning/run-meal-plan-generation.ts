/**
 * MP-2: background meal plan generation with progress + timeout.
 */
import { populateExistingMealPlan } from "@/application/meal-planning/meal-planner";
import type { GenerationProgress } from "@/domain/meal-planning/types";
import { mealPlanGenerationUserTimeoutSec } from "@/platform/config/meal-planning-config";
import { incrementMealPlanGenerationQuota } from "@/platform/db/meal-plan-quota";
import {
  abandonMealPlan,
  updateGenerationProgress,
} from "@/platform/db/meal-planning";
import { recordMealPlanUiGeneration } from "@/platform/observability/meal-planning-metrics";

export async function runMealPlanGenerationJob(
  planId: number,
  tenantId: string,
  userId: string,
  options?: { activate?: boolean },
): Promise<void> {
  const timeoutMs = mealPlanGenerationUserTimeoutSec() * 1000;
  const started = Date.now();

  const onProgress = async (progress: GenerationProgress) => {
    await updateGenerationProgress(planId, tenantId, userId, progress);
  };

  try {
    await onProgress({ phase: "starting", message: "開始規劃…" });

    const result = await Promise.race([
      populateExistingMealPlan(planId, tenantId, userId, {
        activate: options?.activate,
        onProgress,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Generation timed out")),
          timeoutMs,
        );
      }),
    ]);

    await onProgress({ phase: "done", message: "規劃完成" });
    await incrementMealPlanGenerationQuota(tenantId, userId);
    recordMealPlanUiGeneration("ok", Date.now() - started);
    void result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "規劃失敗，請稍後再試";
    await onProgress({
      phase: "error",
      message,
      errors: [message],
    });
    await abandonMealPlan(planId, tenantId, userId);
    recordMealPlanUiGeneration("error", Date.now() - started);
  }
}
