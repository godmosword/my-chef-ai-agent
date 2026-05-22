import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { listRecipeVersions } from "@/lib/db/queries/recipes";
import { getSessionUserId } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const versions = await listRecipeVersions(userId, DEFAULT_TENANT_ID, id);
  if (!versions.length) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    versions: versions.map((v) => ({
      id: v.id,
      recipe_id: v.recipeId,
      version_no: v.versionNo,
      ingredients: v.ingredients,
      steps: v.steps,
      shopping_list: v.shoppingList,
      kitchen_talk: v.kitchenTalk,
      cost_estimate: v.costEstimate,
      source_prompt: v.sourcePrompt,
      diff_from_prompt: v.diffFromPrompt,
      model_used: v.modelUsed,
      deep_research: v.deepResearch,
      created_at: v.createdAt.toISOString(),
    })),
  });
}
