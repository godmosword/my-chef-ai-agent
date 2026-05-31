import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  getUserSettings,
  upsertUserSettings,
} from "@/platform/db/queries/settings";
import { countRecipesForUser } from "@/platform/db/queries/recipes";
import { countSharedRecipesForUser } from "@/platform/db/queries/sharing";
import { getSessionUserId } from "@/platform/identity/session";
import { UpdateUserSettingsSchema } from "@chef/shared-types";
import { readJsonBody } from "@/lib/api/route-helpers";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  const settings = await getUserSettings(userId, DEFAULT_TENANT_ID);
  const [recipe_count, shared_count] = isDatabaseConfigured()
    ? await Promise.all([
        countRecipesForUser(userId, DEFAULT_TENANT_ID),
        countSharedRecipesForUser(userId, DEFAULT_TENANT_ID),
      ])
    : [0, 0];

  return NextResponse.json({
    ok: true,
    settings,
    db_configured: isDatabaseConfigured(),
    recipe_count,
    shared_count,
  });
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;
  const parsed = UpdateUserSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const settings = await upsertUserSettings(
    userId,
    DEFAULT_TENANT_ID,
    parsed.data,
  );

  return NextResponse.json({ ok: true, settings });
}
