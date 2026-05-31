import { NextResponse } from "next/server";
import { PatchDietaryPreferencesSchema } from "@/domain/settings/dietary-api-schemas";
import {
  DIETARY_PRESET_OPTIONS,
  getDietaryPreferences,
  saveDietaryPreferences,
  type DietaryPresetKey,
} from "@/platform/db/dietary-preferences";
import { readJsonBody, requireApiSession } from "@/lib/api/route-helpers";

const VALID_KEYS = new Set(DIETARY_PRESET_OPTIONS.map((p) => p.key));

export async function GET() {
  const session = await requireApiSession({ requireDatabase: false });
  if (session instanceof NextResponse) return session;
  const preferences = await getDietaryPreferences(
    session.userId,
    session.tenantId,
  );
  return NextResponse.json({ ok: true, preferences, presets: DIETARY_PRESET_OPTIONS });
}

export async function PATCH(request: Request) {
  const session = await requireApiSession({ requireDatabase: false });
  if (session instanceof NextResponse) return session;

  const body = await readJsonBody(request);
  if (body instanceof NextResponse) return body;

  const parsed = PatchDietaryPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const current = await getDietaryPreferences(
    session.userId,
    session.tenantId,
  );
  const tags = (parsed.data.tags ?? current.tags).filter((t): t is DietaryPresetKey =>
    VALID_KEYS.has(t as DietaryPresetKey),
  );
  const next = {
    tags,
    avoid_custom:
      parsed.data.avoid_custom !== undefined
        ? parsed.data.avoid_custom
        : current.avoid_custom,
  };
  await saveDietaryPreferences(session.userId, session.tenantId, next);
  return NextResponse.json({ ok: true, preferences: next });
}
