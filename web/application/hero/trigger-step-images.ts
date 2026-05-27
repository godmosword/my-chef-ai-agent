import { and, eq } from "drizzle-orm";
import type { RecipePayload } from "@chef/shared-types";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { getDb } from "@/platform/db/drizzle";
import { getRecipeForUser } from "@/platform/db/queries/recipes";
import { checkQuota, consumeQuota } from "@/platform/db/quota";
import { recipeVersions, recipes } from "@/platform/db/schema";
import { buildStepImagePrompt } from "@/application/hero/build-step-prompt";
import {
  ensureStoredSteps,
  patchStoredStep,
  stepText,
  type StoredStep,
} from "@/application/hero/step-storage";
import {
  generateRecipeHeroImage,
  imageProvider,
  resolveImageApiKey,
} from "@/platform/media/hero-image";

const IMAGE_TIMEOUT_MS = 55_000;
const inFlightStepImages = new Set<string>();

type StepImageLockKey = {
  recipeId: string;
  stepIndex: number;
};

function stepImageLockKey(key: StepImageLockKey): string {
  return `${key.recipeId}:${key.stepIndex}`;
}

export function reserveStepImageRequest(key: StepImageLockKey): boolean {
  const id = stepImageLockKey(key);
  if (inFlightStepImages.has(id)) return false;
  inFlightStepImages.add(id);
  return true;
}

export function releaseStepImageRequest(key: StepImageLockKey): void {
  inFlightStepImages.delete(stepImageLockKey(key));
}

export function isStepImageRequestInFlight(key: StepImageLockKey): boolean {
  return inFlightStepImages.has(stepImageLockKey(key));
}

function maxStepImages(): number {
  const n = parseInt(process.env.MAX_STEP_IMAGES || "6", 10);
  return Math.min(Math.max(n, 0), 6);
}

function shouldGenerateStepImages(): boolean {
  if (process.env.AUTO_STEP_IMAGES !== "1") return false;
  const provider = imageProvider();
  if (provider === "placeholder") return false;
  if (provider === "openai_compatible" && !resolveImageApiKey()) return false;
  return true;
}

async function writeSteps(versionId: string, steps: StoredStep[]): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .update(recipeVersions)
    .set({ steps })
    .where(eq(recipeVersions.id, versionId));
}

export type TriggerStepImagesOptions = {
  recipeId: string;
  userId: string;
  tenantId?: string;
  recipe?: RecipePayload;
};

/** Generate AI images for cooking steps (openai_compatible + API key). */
export async function triggerStepImagesGeneration(
  opts: TriggerStepImagesOptions,
): Promise<void> {
  if (!shouldGenerateStepImages()) return;

  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const db = getDb();
  if (!db) return;

  const [recipeRow] = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      latestVersionId: recipes.latestVersionId,
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, opts.recipeId),
        eq(recipes.userId, opts.userId),
        eq(recipes.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!recipeRow?.latestVersionId) return;

  const versionId = recipeRow.latestVersionId;

  const [versionRow] = await db
    .select({ steps: recipeVersions.steps })
    .from(recipeVersions)
    .where(eq(recipeVersions.id, versionId))
    .limit(1);

  if (!versionRow) return;

  let steps = ensureStoredSteps(versionRow.steps as unknown[]);
  const limit = Math.min(steps.length, maxStepImages());
  if (!limit) return;

  let recipe = opts.recipe;
  if (!recipe) {
    recipe = (await getRecipeForUser(opts.userId, tenantId, opts.recipeId)) ?? undefined;
  }
  if (!recipe) return;

  const recipeName = recipe.recipe_name?.trim() || recipeRow.title;

  for (let i = 0; i < limit; i++) {
    const step = steps[i]!;
    if (step.image_status === "ready" && step.image_url?.trim()) continue;

    const quota = await checkQuota(opts.userId, tenantId, "image");
    if (!quota.image.remaining) {
      steps = patchStoredStep(steps, i, {
        image_status: "failed",
        image_error: "image_quota_exceeded",
      });
      await writeSteps(versionId, steps);
      continue;
    }

    steps = patchStoredStep(steps, i, {
      image_status: "generating",
      image_error: undefined,
    });
    await writeSteps(versionId, steps);

    const text = stepText(step);
    const prompt = buildStepImagePrompt(recipe, text, i, steps.length);

    try {
      const { image_url } = await Promise.race([
        generateRecipeHeroImage(recipeName, { prompt }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("image_generation_timeout")), IMAGE_TIMEOUT_MS);
        }),
      ]);

      const consumed = await consumeQuota(
        opts.userId,
        tenantId,
        1,
        "image_step_generation",
        "image",
      );
      if (!consumed.allowed) {
        steps = patchStoredStep(steps, i, {
          image_status: "failed",
          image_error: "image_quota_exceeded",
        });
        await writeSteps(versionId, steps);
        continue;
      }

      steps = patchStoredStep(steps, i, {
        image_status: "ready",
        image_url,
        image_error: undefined,
      });
      await writeSteps(versionId, steps);
    } catch (err) {
      const message =
        err instanceof Error ? err.message.slice(0, 200) : "unknown";
      steps = patchStoredStep(steps, i, {
        image_status: "failed",
        image_error: message,
      });
      await writeSteps(versionId, steps);
    }
  }
}

export type GenerateStepImageResult =
  | { ok: true; image_url: string }
  | { ok: false; error: string; code?: string };

/** On-demand: generate one step illustration (consumes 1 image quota). */
export async function generateStepImageAtIndex(
  opts: TriggerStepImagesOptions & { stepIndex: number },
): Promise<GenerateStepImageResult> {
  if (!shouldGenerateStepImages()) {
    return { ok: false, error: "步驟插圖功能未啟用", code: "disabled" };
  }

  const lockKey = { recipeId: opts.recipeId, stepIndex: opts.stepIndex };
  if (!reserveStepImageRequest(lockKey)) {
    return { ok: false, error: "正在生成中", code: "busy" };
  }

  try {
    return await generateStepImageAtIndexUnlocked(opts);
  } finally {
    releaseStepImageRequest(lockKey);
  }
}

async function generateStepImageAtIndexUnlocked(
  opts: TriggerStepImagesOptions & { stepIndex: number },
): Promise<GenerateStepImageResult> {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const db = getDb();
  if (!db) return { ok: false, error: "資料庫未設定", code: "no_db" };

  const [recipeRow] = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      latestVersionId: recipes.latestVersionId,
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, opts.recipeId),
        eq(recipes.userId, opts.userId),
        eq(recipes.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!recipeRow?.latestVersionId) {
    return { ok: false, error: "找不到食譜", code: "not_found" };
  }

  const versionId = recipeRow.latestVersionId;
  const [versionRow] = await db
    .select({ steps: recipeVersions.steps })
    .from(recipeVersions)
    .where(eq(recipeVersions.id, versionId))
    .limit(1);

  if (!versionRow) return { ok: false, error: "找不到版本", code: "not_found" };

  let steps = ensureStoredSteps(versionRow.steps as unknown[]);
  const i = opts.stepIndex;
  if (i < 0 || i >= steps.length) {
    return { ok: false, error: "步驟不存在", code: "bad_index" };
  }

  const step = steps[i]!;
  if (step.image_status === "generating") {
    return { ok: false, error: "正在生成中", code: "busy" };
  }
  if (step.image_status === "ready" && step.image_url?.trim()) {
    return { ok: true, image_url: step.image_url };
  }

  const quota = await checkQuota(opts.userId, tenantId, "image");
  if (!quota.image.remaining) {
    return { ok: false, error: "今天的圖片額度已用完", code: "quota" };
  }

  let recipe = opts.recipe;
  if (!recipe) {
    recipe = (await getRecipeForUser(opts.userId, tenantId, opts.recipeId)) ?? undefined;
  }
  if (!recipe) return { ok: false, error: "找不到食譜", code: "not_found" };

  const recipeName = recipe.recipe_name?.trim() || recipeRow.title;

  steps = patchStoredStep(steps, i, {
    image_status: "generating",
    image_error: undefined,
  });
  await writeSteps(versionId, steps);

  const text = stepText(step);
  const prompt = buildStepImagePrompt(recipe, text, i, steps.length);

  try {
    const { image_url } = await Promise.race([
      generateRecipeHeroImage(recipeName, { prompt }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("image_generation_timeout")), IMAGE_TIMEOUT_MS);
      }),
    ]);

    const consumed = await consumeQuota(
      opts.userId,
      tenantId,
      1,
      "image_step_generation",
      "image",
    );
    if (!consumed.allowed) {
      steps = patchStoredStep(steps, i, {
        image_status: "failed",
        image_error: "image_quota_exceeded",
      });
      await writeSteps(versionId, steps);
      return { ok: false, error: "今天的圖片額度已用完", code: "quota" };
    }

    steps = patchStoredStep(steps, i, {
      image_status: "ready",
      image_url,
      image_error: undefined,
    });
    await writeSteps(versionId, steps);
    return { ok: true, image_url };
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : "unknown";
    steps = patchStoredStep(steps, i, {
      image_status: "failed",
      image_error: message,
    });
    await writeSteps(versionId, steps);
    return { ok: false, error: "圖片暫時無法產生", code: "failed" };
  }
}
