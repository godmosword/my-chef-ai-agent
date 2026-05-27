import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { QuotaExceededError, runRecipeFlow } from "@/application/recipe/recipe-flow";
import { isDatabaseConfigured } from "@/platform/db/client";
import { createRecipeFromAi, listRecipesForUser } from "@/platform/db/queries/recipes";
import { isHeroAutoEnabled } from "@/application/hero/preferences";
import { markHeroSkipped, triggerHeroGeneration } from "@/application/hero/trigger";
import { triggerStepImagesGeneration } from "@/application/hero/trigger-step-images";
import { aiRecipeToPayload } from "@/domain/recipe/recipe-payload";
import { getLastRecipeContextFromMemory } from "@/domain/recipe/recipe-memory";
import { extractAndPersist } from "@/application/personalization/preference-extractor";
import { isPreferenceExtractionEnabled } from "@/platform/config/preference-extraction-config";
import {
  isOnboardingFlowEnabled,
  isPersonalizationUiEnabled,
} from "@/platform/config/personalization-ui-config";
import { shouldPromptOnboarding } from "@/platform/db/personalization-onboarding";
import { getSessionUserId } from "@/platform/identity/session";
import type { RecipePayload } from "@chef/shared-types";
import {
  GenerateRecipeRequestSchema,
  ListRecipesQuerySchema,
} from "@chef/shared-types";

export const maxDuration = 60;

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      items: [],
      next_cursor: null,
      db_configured: false,
    });
  }

  const url = new URL(request.url);
  const parsed = ListRecipesQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { items, next_cursor } = await listRecipesForUser(
    userId,
    DEFAULT_TENANT_ID,
    parsed.data,
  );

  return NextResponse.json({
    ok: true,
    items,
    next_cursor,
    db_configured: true,
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = GenerateRecipeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    message,
    context_tags,
    enable_deep_research,
    pantry_items,
    clean_fridge_mode,
    clean_fridge_items,
  } = parsed.data;

  const lastRecipeForExtraction = isPreferenceExtractionEnabled()
    ? await getLastRecipeContextFromMemory(userId, DEFAULT_TENANT_ID)
    : null;

  try {
    const result = await runRecipeFlow(
      userId,
      message,
      DEFAULT_TENANT_ID,
      {
        deepResearch: enable_deep_research,
        pantryItems: pantry_items,
        cleanFridgeMode: clean_fridge_mode,
        cleanFridgeItems: clean_fridge_items,
      },
    );

    let recipe: RecipePayload;
    if (isDatabaseConfigured()) {
      const persisted = await createRecipeFromAi({
        userId,
        tenantId: DEFAULT_TENANT_ID,
        aiRecipe: result.recipe,
        sourcePrompt: message,
        contextTags: context_tags,
        deepResearch: enable_deep_research,
      });
      recipe = persisted ?? aiRecipeToPayload(result.recipe);

      const autoHeroEnv = process.env.AUTO_HERO_IMAGE !== "0";
      const recipeId = recipe.id;
      if (recipeId && recipe.hero_status !== "ready") {
        if (autoHeroEnv && (await isHeroAutoEnabled(userId))) {
          waitUntil(
            (async () => {
              await triggerHeroGeneration({
                recipeId,
                userId,
                tenantId: DEFAULT_TENANT_ID,
                recipe,
              });
            })(),
          );
        } else {
          await markHeroSkipped(recipeId);
          recipe = {
            ...recipe,
            hero_status: "ready",
            photo_url: "/marketing/hero-three-cup-chicken.jpg",
          };
        }
      }
      if (recipeId) {
        waitUntil(
          triggerStepImagesGeneration({
            recipeId,
            userId,
            tenantId: DEFAULT_TENANT_ID,
            recipe,
          }),
        );
      }
    } else {
      recipe = aiRecipeToPayload(result.recipe);
    }

    const showOnboarding =
      isPersonalizationUiEnabled() &&
      isOnboardingFlowEnabled() &&
      (await shouldPromptOnboarding(DEFAULT_TENANT_ID, userId));

    const response = NextResponse.json({
      ok: true,
      recipe,
      quota: result.quota,
      applied_personalization: result.applied_personalization ?? null,
      suggest_onboarding: showOnboarding,
    });

    if (isPreferenceExtractionEnabled()) {
      waitUntil(
        extractAndPersist(
          message,
          DEFAULT_TENANT_ID,
          userId,
          lastRecipeForExtraction,
        ),
      );
    }

    return response;
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        {
          ok: false,
          error: "今日免費額度已用完，請明天再試。",
          quota: err.quota,
        },
        { status: 429 },
      );
    }
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("recipe generation failed:", err);
    const hint = msg.includes("recipe_versions")
      ? "食譜無法寫入資料庫。若為新環境，請在 Neon 執行：pnpm -F @chef/web db:migrate"
      : msg;
    return NextResponse.json({ ok: false, error: hint }, { status: 502 });
  }
}
