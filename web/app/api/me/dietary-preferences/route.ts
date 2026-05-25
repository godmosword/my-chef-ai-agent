import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import {
  DIETARY_PRESET_OPTIONS,
  getDietaryPreferences,
  saveDietaryPreferences,
  type DietaryPresetKey,
} from "@/lib/db/dietary-preferences";
import { getSessionUserId } from "@/lib/session";

const VALID_KEYS = new Set(DIETARY_PRESET_OPTIONS.map((p) => p.key));

const PatchSchema = z.object({
  tags: z.array(z.string()).optional(),
  avoid_custom: z.string().max(500).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }
  const preferences = await getDietaryPreferences(userId, DEFAULT_TENANT_ID);
  return NextResponse.json({ ok: true, preferences, presets: DIETARY_PRESET_OPTIONS });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const current = await getDietaryPreferences(userId, DEFAULT_TENANT_ID);
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
  await saveDietaryPreferences(userId, DEFAULT_TENANT_ID, next);
  return NextResponse.json({ ok: true, preferences: next });
}
