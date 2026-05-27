import { NextResponse } from "next/server";
import { annotateRecipeIngredients } from "@/application/pantry/pantry-ingredient-match";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import {
  pantryAnnotationTimeoutMs,
  showPantryAnnotationsOnRecipe,
} from "@/platform/config/pantry-ui-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getSessionUserId } from "@/platform/identity/session";
import { recordRecipePantryAnnotation } from "@/platform/observability/pantry-metrics";

export async function POST(request: Request) {
  if (!showPantryAnnotationsOnRecipe()) {
    recordRecipePantryAnnotation("skipped");
    return NextResponse.json({ annotations: [], match_count: 0, total: 0 });
  }
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    recordRecipePantryAnnotation("skipped");
    return NextResponse.json({ annotations: [], match_count: 0, total: 0 });
  }

  const body = (await request.json()) as {
    ingredients?: Array<{ name?: string } | string>;
  };
  const ingredients = body.ingredients ?? [];

  try {
    const result = await annotateRecipeIngredients(
      DEFAULT_TENANT_ID,
      userId,
      ingredients,
      pantryAnnotationTimeoutMs(),
    );
    if (result.timed_out) {
      recordRecipePantryAnnotation("timeout");
    } else {
      const rate = result.total ? result.match_count / result.total : 0;
      recordRecipePantryAnnotation("ok", rate);
    }
    return NextResponse.json(result);
  } catch {
    recordRecipePantryAnnotation("timeout");
    return NextResponse.json({
      annotations: [],
      match_count: 0,
      total: ingredients.length,
      timed_out: true,
    });
  }
}
