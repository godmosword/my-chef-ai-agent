import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import type { AiRecipePayload } from "@/domain/recipe/ai-recipe-payload";
import { generateRecipeHeroImage } from "@/platform/media/hero-image";
import { getLastRecipePayloadFromMemory } from "@/application/recipe/recipe-memory";
import { consumeQuota } from "@/platform/db/quota";
import {
  readJsonBody,
  requireApiSession,
} from "@/lib/api/route-helpers";

export const maxDuration = 60;

type HeroRequestBody = {
  recipe_name?: string;
  recipe_data?: AiRecipePayload;
};

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const json = await readJsonBody(request);
  if (json instanceof NextResponse) return json;
  const body = json as HeroRequestBody;

  let recipe = body.recipe_data;
  const nameFromBody = (body.recipe_name || "").trim();
  if (!recipe?.recipe_name && !nameFromBody) {
    recipe =
      (await getLastRecipePayloadFromMemory(
        session.userId,
        DEFAULT_TENANT_ID,
      )) ?? undefined;
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
      session.userId,
      session.tenantId,
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

    const { image_url, source } = await generateRecipeHeroImage(recipeName, {
      recipe,
    });
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
