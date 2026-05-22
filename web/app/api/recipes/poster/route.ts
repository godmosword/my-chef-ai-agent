import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import type { RecipePayload } from "@/lib/ai/generate-recipe";
import { buildRecipePosterHtml } from "@/lib/poster/recipe-poster-html";
import { getLastRecipeFromMemory } from "@/lib/recipe-memory";
import { getSessionUserId } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  let body: { recipe_data?: RecipePayload; recipe_name?: string; photo_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  let recipe = body.recipe_data;
  if (!recipe?.recipe_name) {
    recipe = (await getLastRecipeFromMemory(userId, DEFAULT_TENANT_ID)) ?? undefined;
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
