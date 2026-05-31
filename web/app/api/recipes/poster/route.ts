import { NextResponse } from "next/server";
import type { AiRecipePayload } from "@/domain/recipe/ai-recipe-payload";
import { buildRecipePosterHtml } from "@/application/poster/recipe-poster-html";
import { getLastRecipePayloadFromMemory } from "@/application/recipe/recipe-memory";
import {
  readJsonBody,
  requireApiSession,
} from "@/lib/api/route-helpers";

type PosterRequestBody = {
  recipe_data?: AiRecipePayload;
  recipe_name?: string;
  photo_url?: string;
};

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const json = await readJsonBody(request);
  if (json instanceof NextResponse) return json;
  const body = json as PosterRequestBody;

  let recipe = body.recipe_data;
  if (!recipe?.recipe_name && body.recipe_name?.trim()) {
    recipe = { recipe_name: body.recipe_name.trim() };
  }
  if (!recipe?.recipe_name) {
    recipe =
      (await getLastRecipePayloadFromMemory(
        session.userId,
        session.tenantId,
      )) ?? undefined;
  }
  if (!recipe?.recipe_name) {
    return NextResponse.json(
      { ok: false, error: "請先產生一道食譜" },
      { status: 400 },
    );
  }

  if (body.photo_url) {
    recipe = { ...recipe, photo_url: body.photo_url };
  }

  const html = buildRecipePosterHtml(recipe);
  const filename = `${(recipe.recipe_name || "recipe").replace(/[^\w\u4e00-\u9fff]+/g, "_")}-poster.html`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
