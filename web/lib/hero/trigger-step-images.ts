import { and, eq } from "drizzle-orm";
import type { RecipePayload } from "@chef/shared-types";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { getDb } from "@/lib/db/drizzle";
import { getRecipeForUser } from "@/lib/db/queries/recipes";
import { checkQuota, consumeQuota } from "@/lib/db/quota";
import { recipeVersions, recipes } from "@/lib/db/schema";
import { buildStepImagePrompt } from "@/lib/hero/build-step-prompt";
import {
  ensureStoredSteps,
  patchStoredStep,
  stepText,
  type StoredStep,
} from "@/lib/hero/step-storage";
import {
  generateRecipeHeroImage,
  imageProvider,
  resolveImageApiKey,
} from "@/lib/media/hero-image";

const IMAGE_TIMEOUT_MS = 20_000;

function maxStepImages(): number {
  const n = parseInt(process.env.MAX_STEP_IMAGES || "6", 10);
  return Math.min(Math.max(n, 0), 6);
}

function shouldGenerateStepImages(): boolean {
  if (process.env.AUTO_STEP_IMAGES === "0") return false;
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
