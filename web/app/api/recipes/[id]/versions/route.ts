import { NextResponse } from "next/server";
import { listRecipeVersions } from "@/platform/db/queries/recipes";
import { requireApiSession } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const versions = await listRecipeVersions(session.userId, session.tenantId, id);
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
