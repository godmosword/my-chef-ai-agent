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

type StepImageContext =
  | {
      ok: true;
      tenantId: string;
      versionId: string;
      recipeTitle: string;
      steps: StoredStep[];
    }
  | {
      ok: false;
      reason: "no_db" | "recipe_not_found" | "version_not_found";
    };

async function loadStepImageContext(
  opts: TriggerStepImagesOptions,
): Promise<StepImageContext> {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const db = getDb();
  if (!db) return { ok: false, reason: "no_db" };

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
    return { ok: false, reason: "recipe_not_found" };
  }

  const [versionRow] = await db
    .select({ steps: recipeVersions.steps })
    .from(recipeVersions)
    .where(eq(recipeVersions.id, recipeRow.latestVersionId))
    .limit(1);

  if (!versionRow) return { ok: false, reason: "version_not_found" };

  return {
    ok: true,
    tenantId,
    versionId: recipeRow.latestVersionId,
    recipeTitle: recipeRow.title,
    steps: ensureStoredSteps(versionRow.steps as unknown[]),
  };
}

async function resolveRecipePayload(
  opts: TriggerStepImagesOptions,
  tenantId: string,
): Promise<RecipePayload | null> {
  if (opts.recipe) return opts.recipe;
  return getRecipeForUser(opts.userId, tenantId, opts.recipeId);
}

function recipeNameForImage(recipe: RecipePayload, fallbackTitle: string): string {
  return recipe.recipe_name?.trim() || fallbackTitle;
}

function imageGenerationTimeout(): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("image_generation_timeout")), IMAGE_TIMEOUT_MS);
  });
}

async function generateStepImageUrl(
  recipeName: string,
  prompt: string,
): Promise<string> {
  const { image_url } = await Promise.race([
    generateRecipeHeroImage(recipeName, { prompt }),
    imageGenerationTimeout(),
  ]);
  return image_url;
}

type StoredStepImageResult =
  | { status: "ready"; imageUrl: string; steps: StoredStep[] }
  | { status: "quota" | "failed"; steps: StoredStep[] };

async function generateAndStoreStepImage(input: {
  opts: TriggerStepImagesOptions;
  context: Extract<StepImageContext, { ok: true }>;
  steps: StoredStep[];
  stepIndex: number;
  step: StoredStep;
  recipe: RecipePayload;
  recipeName: string;
}): Promise<StoredStepImageResult> {
  let steps = patchStoredStep(input.steps, input.stepIndex, {
    image_status: "generating",
    image_error: undefined,
  });
  await writeSteps(input.context.versionId, steps);

  const text = stepText(input.step);
  const prompt = buildStepImagePrompt(
    input.recipe,
    text,
    input.stepIndex,
    steps.length,
  );

  try {
    const imageUrl = await generateStepImageUrl(input.recipeName, prompt);

    const consumed = await consumeQuota(
      input.opts.userId,
      input.context.tenantId,
      1,
      "image_step_generation",
      "image",
    );
    if (!consumed.allowed) {
      steps = patchStoredStep(steps, input.stepIndex, {
        image_status: "failed",
        image_error: "image_quota_exceeded",
      });
      await writeSteps(input.context.versionId, steps);
      return { status: "quota", steps };
    }

    steps = patchStoredStep(steps, input.stepIndex, {
      image_status: "ready",
      image_url: imageUrl,
      image_error: undefined,
    });
    await writeSteps(input.context.versionId, steps);
    return { status: "ready", imageUrl, steps };
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : "unknown";
    steps = patchStoredStep(steps, input.stepIndex, {
      image_status: "failed",
      image_error: message,
    });
    await writeSteps(input.context.versionId, steps);
    return { status: "failed", steps };
  }
}

/** Generate AI images for cooking steps (openai_compatible + API key). */
export async function triggerStepImagesGeneration(
  opts: TriggerStepImagesOptions,
): Promise<void> {
  if (!shouldGenerateStepImages()) return;

  const context = await loadStepImageContext(opts);
  if (!context.ok) return;

  let steps = context.steps;
  const limit = Math.min(steps.length, maxStepImages());
  if (!limit) return;

  const recipe = await resolveRecipePayload(opts, context.tenantId);
  if (!recipe) return;

  const recipeName = recipeNameForImage(recipe, context.recipeTitle);

  for (let i = 0; i < limit; i++) {
    const step = steps[i]!;
    if (step.image_status === "ready" && step.image_url?.trim()) continue;

    const quota = await checkQuota(opts.userId, context.tenantId, "image");
    if (!quota.image.remaining) {
      steps = patchStoredStep(steps, i, {
        image_status: "failed",
        image_error: "image_quota_exceeded",
      });
      await writeSteps(context.versionId, steps);
      continue;
    }

    const result = await generateAndStoreStepImage({
      opts,
      context,
      steps,
      stepIndex: i,
      step,
      recipe,
      recipeName,
    });
    steps = result.steps;
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
  const context = await loadStepImageContext(opts);
  if (!context.ok && context.reason === "no_db") {
    return { ok: false, error: "資料庫未設定", code: "no_db" };
  }
  if (!context.ok && context.reason === "recipe_not_found") {
    return { ok: false, error: "找不到食譜", code: "not_found" };
  }
  if (!context.ok) return { ok: false, error: "找不到版本", code: "not_found" };

  let steps = context.steps;
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

  const quota = await checkQuota(opts.userId, context.tenantId, "image");
  if (!quota.image.remaining) {
    return { ok: false, error: "今天的圖片額度已用完", code: "quota" };
  }

  const recipe = await resolveRecipePayload(opts, context.tenantId);
  if (!recipe) return { ok: false, error: "找不到食譜", code: "not_found" };

  const recipeName = recipeNameForImage(recipe, context.recipeTitle);

  const result = await generateAndStoreStepImage({
    opts,
    context,
    steps,
    stepIndex: i,
    step,
    recipe,
    recipeName,
  });

  if (result.status === "ready") {
    return { ok: true, image_url: result.imageUrl };
  }
  if (result.status === "quota") {
    return { ok: false, error: "今天的圖片額度已用完", code: "quota" };
  }
  return { ok: false, error: "圖片暫時無法產生", code: "failed" };
}
