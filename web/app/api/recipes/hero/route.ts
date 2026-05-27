import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import type { RecipePayload } from "@/domain/recipe/generate-recipe";
import { generateRecipeHeroImageByName } from "@/platform/media/hero-image";
import { getLastRecipeFromMemory } from "@/domain/recipe/recipe-memory";
import { consumeQuota } from "@/platform/db/quota";
import { getSessionUserId } from "@/platform/identity/session";

export const maxDuration = 60;

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  let body: { recipe_name?: string; recipe_data?: RecipePayload };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  let recipe = body.recipe_data;
  const nameFromBody = (body.recipe_name || "").trim();
  if (!recipe?.recipe_name && !nameFromBody) {
    recipe = (await getLastRecipeFromMemory(userId, DEFAULT_TENANT_ID)) ?? undefined;
  }
  const recipeName = nameFromBody || recipe?.recipe_name;
  if (!recipeName) {
    return NextResponse.json(
      { ok: false, error: "請先產生一道食譜，或提供 recipe_name" },
      { status: 400 },
    );
  }

  try {
    const quota = await consumeQuota(
      userId,
      DEFAULT_TENANT_ID,
      1,
      "image_recipe_generation",
      "image",
    );
    if (!quota.allowed) {
      return NextResponse.json(
        { ok: false, error: "今日額度已用完", quota },
        { status: 429 },
      );
    }

    const { image_url, source } = await generateRecipeHeroImageByName(recipeName);
    return NextResponse.json({
      ok: true,
      recipe_name: recipeName,
      image_url,
      source,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
