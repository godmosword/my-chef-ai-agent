import { and, eq, inArray } from "drizzle-orm";
import type { RecipePayload } from "@chef/shared-types";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { getDb } from "@/platform/db/drizzle";
import { getRecipeForUser } from "@/platform/db/queries/recipes";
import { checkQuota, consumeQuota, refundQuota } from "@/platform/db/quota";
import { recipes } from "@/platform/db/schema";
import { buildHeroPrompt } from "@/application/hero/build-prompt";
import {
  generateRecipeHeroImage,
  getPlaceholderHeroUrl,
  resolveImageApiKey,
  imageProvider,
} from "@/platform/media/hero-image";

const IMAGE_TIMEOUT_MS = 55_000;

export type TriggerHeroOptions = {
  recipeId: string;
  userId: string;
  tenantId?: string;
  /** Skip idempotency and re-run generation (manual retry). */
  force?: boolean;
  recipe?: RecipePayload;
};

async function markHero(
  recipeId: string,
  patch: {
    heroStatus: string;
    heroUrl?: string | null;
    heroError?: string | null;
  },
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .update(recipes)
    .set({
      heroStatus: patch.heroStatus,
      heroUrl: patch.heroUrl,
      heroError: patch.heroError ?? null,
      heroUpdatedAt: new Date(),
    })
    .where(eq(recipes.id, recipeId));
}

export async function triggerHeroGeneration(
  opts: TriggerHeroOptions,
): Promise<void> {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const db = getDb();
  if (!db) return;

  const [row] = await db
    .select()
    .from(recipes)
    .where(
      and(
        eq(recipes.id, opts.recipeId),
        eq(recipes.userId, opts.userId),
        eq(recipes.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!row) return;

  if (
    !opts.force &&
    row.heroStatus === "ready" &&
    row.heroUrl &&
    row.heroUrl.trim()
  ) {
    return;
  }

  if (!opts.force && row.heroStatus === "skipped") {
    return;
  }

  if (!opts.force && row.heroStatus === "generating") {
    return;
  }

  const provider = imageProvider();
  if (provider === "openai_compatible" && !resolveImageApiKey()) {
    console.warn(
      "[hero-auto] IMAGE_PROVIDER=openai_compatible but no image API key; using placeholder fallback",
    );
  }

  const quota = await checkQuota(opts.userId, tenantId, "image");
  if (!quota.image.remaining) {
    await markHero(opts.recipeId, {
      heroStatus: "failed",
      heroError: "image_quota_exceeded",
    });
    return;
  }

  const statusGuard = opts.force
    ? eq(recipes.id, opts.recipeId)
    : and(
        eq(recipes.id, opts.recipeId),
        inArray(recipes.heroStatus, ["pending", "failed"]),
      );

  const updated = await db
    .update(recipes)
    .set({
      heroStatus: "generating",
      heroError: null,
      heroUpdatedAt: new Date(),
    })
    .where(statusGuard)
    .returning({ id: recipes.id });

  if (!updated.length) return;

  let recipe = opts.recipe;
  if (!recipe) {
    recipe = (await getRecipeForUser(opts.userId, tenantId, opts.recipeId)) ?? undefined;
  }
  if (!recipe) {
    await markHero(opts.recipeId, {
      heroStatus: "failed",
      heroError: "recipe_not_found",
    });
    return;
  }

  const consumed = await consumeQuota(
    opts.userId,
    tenantId,
    1,
    "image_recipe_generation",
    "image",
  );
  if (!consumed.allowed) {
    await markHero(opts.recipeId, {
      heroStatus: "failed",
      heroError: "image_quota_exceeded",
    });
    return;
  }

  const prompt = buildHeroPrompt(recipe);
  const recipeName = recipe.recipe_name?.trim() || row.title;

  try {
    const { image_url } = await Promise.race([
      generateRecipeHeroImage(recipeName, { prompt }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("image_generation_timeout")), IMAGE_TIMEOUT_MS);
      }),
    ]);

    await markHero(opts.recipeId, {
      heroStatus: "ready",
      heroUrl: image_url,
      heroError: null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 200) : "unknown";
    console.error("[hero-auto] generation failed:", message);
    await refundQuota(
      opts.userId,
      tenantId,
      1,
      "image_recipe_generation_refund",
      "image",
    );
    // Degraded: show committed marketing hero so UI is not stuck on failed/skipped.
    await markHero(opts.recipeId, {
      heroStatus: "ready",
      heroUrl: getPlaceholderHeroUrl(recipeName),
      heroError: message,
    });
  }
}

export async function markHeroSkipped(recipeId: string): Promise<void> {
  await markHero(recipeId, {
    heroStatus: "ready",
    heroUrl: getPlaceholderHeroUrl(),
    heroError: "hero_auto_disabled",
  });
}
