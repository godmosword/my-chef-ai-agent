import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { z } from "zod";
import {
  getRecipeForUser,
  patchRecipeMeta,
  softDeleteRecipe,
} from "@/lib/db/queries/recipes";
import { getSessionUserId } from "@/lib/session";

const PatchRecipeSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  record_cook: z.boolean().optional(),
});

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

  const recipe = await getRecipeForUser(userId, DEFAULT_TENANT_ID, id);
  if (!recipe) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, recipe });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchRecipeSchema.safeParse(body);
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

  const ok = await patchRecipeMeta(userId, DEFAULT_TENANT_ID, id, {
    rating: parsed.data.rating,
    recordCook: parsed.data.record_cook,
  });

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, updated: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  const deleted = await softDeleteRecipe(userId, DEFAULT_TENANT_ID, id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
