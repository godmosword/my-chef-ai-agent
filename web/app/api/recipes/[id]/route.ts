import { NextResponse } from "next/server";
import { PatchRecipeMetaSchema } from "@/domain/recipe/recipe-api-schemas";
import {
  getRecipeForUser,
  patchRecipeMeta,
  softDeleteRecipe,
} from "@/platform/db/queries/recipes";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const recipe = await getRecipeForUser(session.userId, session.tenantId, id);
  if (!recipe) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, recipe });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = PatchRecipeMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!parsed.data.record_cook && parsed.data.rating == null) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update" },
      { status: 400 },
    );
  }

  const ok = await patchRecipeMeta(session.userId, session.tenantId, id, {
    rating: parsed.data.rating,
    recordCook: parsed.data.record_cook,
  });

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, updated: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const deleted = await softDeleteRecipe(session.userId, session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
