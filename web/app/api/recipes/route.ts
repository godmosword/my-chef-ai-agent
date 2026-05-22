import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { QuotaExceededError, runRecipeFlow } from "@/lib/ai/recipe-flow";
import { isDatabaseConfigured } from "@/lib/db/client";
import { createRecipeFromAi, listRecipesForUser } from "@/lib/db/queries/recipes";
import { aiRecipeToPayload } from "@/lib/recipe-payload";
import { getSessionUserId } from "@/lib/session";
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

  const { message, context_tags, enable_deep_research } = parsed.data;

  try {
    const result = await runRecipeFlow(
      userId,
      message,
      DEFAULT_TENANT_ID,
      { deepResearch: enable_deep_research },
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
    } else {
      recipe = aiRecipeToPayload(result.recipe);
    }

    return NextResponse.json({
      ok: true,
      recipe,
      quota: result.quota,
    });
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
    console.error("recipe generation failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
